'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { SessionUser } from '@/lib/auth/session';

/**
 * Header account affordance. Signed-out shows a plain "Sign in" link; signed-in
 * shows an avatar button with a dropdown. The signed-in state is fetched from
 * /api/auth/me after mount so the root layout stays static and the catalogue
 * prerenders; signed-out visitors (the majority) see the correct state
 * immediately, signed-in visitors see the avatar appear right after hydration.
 */
export function AccountMenu() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Re-probe on every route change: the menu lives in the persistent layout,
  // so this is what picks up a fresh login when AuthForm navigates away.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((data) => {
        if (!cancelled) setUser(data.user ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!user) {
    return (
      <Link href="/login" className="btn-ghost h-10 shrink-0 px-3 py-0" aria-label="Sign in">
        <UserIcon />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }

  const initials =
    (user.fullName ?? user.email)
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

  const isAdmin = user.role === 'admin' || user.role === 'owner' || user.role === 'staff';

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setOpen(false);
    router.push('/');
    router.refresh();
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white transition hover:bg-brand-dark focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      >
        {initials}
      </button>

      {open && (
        <div className="card absolute right-0 top-full z-50 mt-2 w-56 p-2 shadow-pop">
          <div className="border-b border-line px-3 py-2">
            <div className="truncate text-sm font-medium text-fg">{user.fullName ?? 'Signed in'}</div>
            <div className="truncate text-xs text-muted">{user.email}</div>
          </div>

          <MenuLink href="/account" onClick={() => setOpen(false)}>Your account</MenuLink>
          <MenuLink href="/account/orders" onClick={() => setOpen(false)}>Orders</MenuLink>
          <MenuLink href="/account/saved" onClick={() => setOpen(false)}>Saved stones</MenuLink>

          {isAdmin && (
            <>
              <div className="my-1 border-t border-line" />
              <MenuLink href="/admin" onClick={() => setOpen(false)} accent>
                Admin portal
              </MenuLink>
            </>
          )}

          <div className="my-1 border-t border-line" />
          <button
            onClick={logout}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-muted transition hover:bg-surface-2 hover:text-fg"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href, children, onClick, accent = false,
}: {
  href: string;
  children: React.ReactNode;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`block rounded-lg px-3 py-2 text-sm transition hover:bg-brand-tint ${
        accent ? 'font-medium text-brand hover:text-brand-dark' : 'text-muted hover:text-fg'
      }`}
    >
      {children}
    </Link>
  );
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="5" r="2.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.5 13.5c0-2.5 2.5-4 5.5-4s5.5 1.5 5.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
