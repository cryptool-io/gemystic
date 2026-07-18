import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { config } from '../config';
import { prisma, hasDatabase } from '../prisma';

/**
 * User + session store.
 *
 * Two drivers behind one `UserStore` interface, the same pattern the mailer and
 * storage adapters use:
 *   - PrismaUserStore: the real `users`/`sessions`/`password_reset_tokens`
 *     tables. Selected automatically when DATABASE_URL is set.
 *   - JsonUserStore: local-first JSON file, so a keyless install still has
 *     working authentication. NOT for high write concurrency.
 *
 * Callers never know which driver they got, so the swap has no caller impact.
 */

export type Role = 'customer' | 'staff' | 'admin' | 'owner';

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string | null;
  role: Role;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface StoredSession {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
}

export interface StoredResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

interface DbShape {
  users: StoredUser[];
  sessions: StoredSession[];
  resetTokens?: StoredResetToken[];
}

const DB_PATH = join(config.paths.var, 'auth', 'users.json');

async function read(): Promise<DbShape> {
  try {
    return JSON.parse(await readFile(DB_PATH, 'utf8')) as DbShape;
  } catch {
    return { users: [], sessions: [] };
  }
}

async function write(db: DbShape): Promise<void> {
  await mkdir(dirname(DB_PATH), { recursive: true });
  await writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

export interface UserStore {
  findByEmail(email: string): Promise<StoredUser | null>;
  findById(id: string): Promise<StoredUser | null>;
  createUser(u: Omit<StoredUser, 'id' | 'createdAt' | 'lastLoginAt'>): Promise<StoredUser>;
  touchLogin(id: string): Promise<void>;
  countUsers(): Promise<number>;
  setRole(id: string, role: Role): Promise<void>;
  setPassword(id: string, passwordHash: string): Promise<void>;
  listUsers(): Promise<StoredUser[]>;

  createSession(s: Omit<StoredSession, 'id' | 'createdAt'>): Promise<StoredSession>;
  findSessionByTokenHash(tokenHash: string): Promise<StoredSession | null>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteUserSessions(userId: string): Promise<void>;

  createResetToken(t: Omit<StoredResetToken, 'id' | 'createdAt' | 'usedAt'>): Promise<void>;
  /** Unused, unexpired token or null. */
  findResetToken(tokenHash: string): Promise<StoredResetToken | null>;
  consumeResetToken(tokenHash: string): Promise<void>;
}

function uid(): string {
  // crypto.randomUUID is available in the Node runtime.
  return globalThis.crypto.randomUUID();
}

class JsonUserStore implements UserStore {
  async findByEmail(email: string) {
    const db = await read();
    const lower = email.toLowerCase();
    return db.users.find((u) => u.email.toLowerCase() === lower) ?? null;
  }

  async findById(id: string) {
    const db = await read();
    return db.users.find((u) => u.id === id) ?? null;
  }

  async createUser(u: Omit<StoredUser, 'id' | 'createdAt' | 'lastLoginAt'>) {
    const db = await read();
    const user: StoredUser = {
      ...u,
      id: uid(),
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    };
    db.users.push(user);
    await write(db);
    return user;
  }

  async touchLogin(id: string) {
    const db = await read();
    const u = db.users.find((x) => x.id === id);
    if (u) {
      u.lastLoginAt = new Date().toISOString();
      await write(db);
    }
  }

  async countUsers() {
    return (await read()).users.length;
  }

  async setRole(id: string, role: Role) {
    const db = await read();
    const u = db.users.find((x) => x.id === id);
    if (u) {
      u.role = role;
      await write(db);
    }
  }

  async setPassword(id: string, passwordHash: string) {
    const db = await read();
    const u = db.users.find((x) => x.id === id);
    if (u) {
      u.passwordHash = passwordHash;
      await write(db);
    }
  }

  async listUsers() {
    return (await read()).users;
  }

  async createSession(s: Omit<StoredSession, 'id' | 'createdAt'>) {
    const db = await read();
    const session: StoredSession = { ...s, id: uid(), createdAt: new Date().toISOString() };
    db.sessions.push(session);
    // Opportunistically sweep expired sessions so the file does not grow forever.
    const now = Date.now();
    db.sessions = db.sessions.filter((x) => new Date(x.expiresAt).getTime() > now);
    await write(db);
    return session;
  }

  async findSessionByTokenHash(tokenHash: string) {
    const db = await read();
    const s = db.sessions.find((x) => x.tokenHash === tokenHash);
    if (!s) return null;
    if (new Date(s.expiresAt).getTime() < Date.now()) return null;
    return s;
  }

  async deleteSession(tokenHash: string) {
    const db = await read();
    db.sessions = db.sessions.filter((x) => x.tokenHash !== tokenHash);
    await write(db);
  }

  async deleteUserSessions(userId: string) {
    const db = await read();
    db.sessions = db.sessions.filter((x) => x.userId !== userId);
    await write(db);
  }

  async createResetToken(t: Omit<StoredResetToken, 'id' | 'createdAt' | 'usedAt'>) {
    const db = await read();
    db.resetTokens ??= [];
    // One outstanding token per user: a re-request invalidates earlier links.
    db.resetTokens = db.resetTokens.filter((x) => x.userId !== t.userId);
    db.resetTokens.push({
      ...t,
      id: uid(),
      usedAt: null,
      createdAt: new Date().toISOString(),
    });
    await write(db);
  }

  async findResetToken(tokenHash: string) {
    const db = await read();
    const t = (db.resetTokens ?? []).find((x) => x.tokenHash === tokenHash);
    if (!t || t.usedAt) return null;
    if (new Date(t.expiresAt).getTime() < Date.now()) return null;
    return t;
  }

  async consumeResetToken(tokenHash: string) {
    const db = await read();
    const t = (db.resetTokens ?? []).find((x) => x.tokenHash === tokenHash);
    if (t) {
      t.usedAt = new Date().toISOString();
      await write(db);
    }
  }
}

/** Maps a Prisma row (Date fields, nullable hash) onto the store shape. */
function toStoredUser(u: {
  id: string;
  email: string;
  passwordHash: string | null;
  fullName: string | null;
  role: string;
  createdAt: Date;
  lastLoginAt: Date | null;
}): StoredUser {
  return {
    id: u.id,
    email: u.email,
    passwordHash: u.passwordHash ?? '',
    fullName: u.fullName,
    role: u.role as Role,
    createdAt: u.createdAt.toISOString(),
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
  };
}

class PrismaUserStore implements UserStore {
  async findByEmail(email: string) {
    const u = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    return u ? toStoredUser(u) : null;
  }

  async findById(id: string) {
    const u = await prisma.user.findUnique({ where: { id } });
    return u ? toStoredUser(u) : null;
  }

  async createUser(u: Omit<StoredUser, 'id' | 'createdAt' | 'lastLoginAt'>) {
    const created = await prisma.user.create({
      data: {
        email: u.email.toLowerCase(),
        passwordHash: u.passwordHash,
        fullName: u.fullName,
        role: u.role,
      },
    });
    return toStoredUser(created);
  }

  async touchLogin(id: string) {
    await prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
  }

  async countUsers() {
    return prisma.user.count();
  }

  async setRole(id: string, role: Role) {
    await prisma.user.update({ where: { id }, data: { role } });
  }

  async setPassword(id: string, passwordHash: string) {
    await prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  async listUsers() {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    return users.map(toStoredUser);
  }

  async createSession(s: Omit<StoredSession, 'id' | 'createdAt'>) {
    const created = await prisma.session.create({
      data: {
        userId: s.userId,
        tokenHash: s.tokenHash,
        expiresAt: new Date(s.expiresAt),
      },
    });
    return {
      id: created.id,
      userId: created.userId,
      tokenHash: created.tokenHash,
      expiresAt: created.expiresAt.toISOString(),
      createdAt: created.createdAt.toISOString(),
    };
  }

  async findSessionByTokenHash(tokenHash: string) {
    const s = await prisma.session.findUnique({ where: { tokenHash } });
    if (!s || s.revokedAt) return null;
    if (s.expiresAt.getTime() < Date.now()) return null;
    return {
      id: s.id,
      userId: s.userId,
      tokenHash: s.tokenHash,
      expiresAt: s.expiresAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
    };
  }

  async deleteSession(tokenHash: string) {
    await prisma.session.deleteMany({ where: { tokenHash } });
  }

  async deleteUserSessions(userId: string) {
    await prisma.session.deleteMany({ where: { userId } });
  }

  async createResetToken(t: Omit<StoredResetToken, 'id' | 'createdAt' | 'usedAt'>) {
    // One outstanding token per user: a re-request invalidates earlier links.
    await prisma.passwordResetToken.deleteMany({ where: { userId: t.userId } });
    await prisma.passwordResetToken.create({
      data: {
        userId: t.userId,
        tokenHash: t.tokenHash,
        expiresAt: new Date(t.expiresAt),
      },
    });
  }

  async findResetToken(tokenHash: string) {
    const t = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!t || t.usedAt) return null;
    if (t.expiresAt.getTime() < Date.now()) return null;
    return {
      id: t.id,
      userId: t.userId,
      tokenHash: t.tokenHash,
      expiresAt: t.expiresAt.toISOString(),
      usedAt: null,
      createdAt: t.createdAt.toISOString(),
    };
  }

  async consumeResetToken(tokenHash: string) {
    await prisma.passwordResetToken.updateMany({
      where: { tokenHash },
      data: { usedAt: new Date() },
    });
  }
}

let instance: UserStore | null = null;

export function userStore(): UserStore {
  instance ??= hasDatabase() ? new PrismaUserStore() : new JsonUserStore();
  return instance;
}
