import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { config } from '../config';

/**
 * User + session store.
 *
 * This is the local-first driver: a JSON file on disk, the same pattern the
 * mailer and storage adapters use. It exists so the platform has real,
 * working authentication TODAY without a database — you can sign up, log in,
 * and reach the admin. The `UserStore` interface is what the rest of the app
 * depends on, so swapping this for the Postgres `users`/`sessions` tables
 * (db/migrations/001_init.sql) is a one-file change with no caller impact.
 *
 * It is deliberately NOT for high write concurrency — a busy production shop
 * belongs on Postgres. For a single-operator local deploy it is correct.
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

interface DbShape {
  users: StoredUser[];
  sessions: StoredSession[];
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
  listUsers(): Promise<StoredUser[]>;

  createSession(s: Omit<StoredSession, 'id' | 'createdAt'>): Promise<StoredSession>;
  findSessionByTokenHash(tokenHash: string): Promise<StoredSession | null>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteUserSessions(userId: string): Promise<void>;
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
}

let instance: UserStore | null = null;

export function userStore(): UserStore {
  instance ??= new JsonUserStore();
  return instance;
}
