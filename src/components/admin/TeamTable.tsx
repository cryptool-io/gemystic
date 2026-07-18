'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Role } from '@/lib/auth/store';

interface Row {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
  createdAt: string;
  lastLoginAt: string | null;
}

const ROLES: Role[] = ['customer', 'staff', 'admin', 'owner'];
const RANK: Record<Role, number> = { customer: 0, staff: 1, admin: 2, owner: 3 };

/**
 * Team role editor. The server route is the real authority — these disabled
 * states just avoid presenting an action that will be rejected. Every rule the
 * UI enforces here is also enforced server-side in /api/admin/role.
 */
export function TeamTable({
  rows,
  actorId,
  actorRole,
}: {
  rows: Row[];
  actorId: string;
  actorRole: Role;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ownerCount = rows.filter((r) => r.role === 'owner').length;

  async function changeRole(userId: string, role: Role) {
    setBusy(userId);
    setError(null);
    try {
      const res = await fetch('/api/admin/role', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? 'Could not change role.');
      } else {
        router.refresh();
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(null);
    }
  }

  function canEdit(row: Row): boolean {
    if (row.id === actorId) return false; // no self-edit
    // Only the owner may touch admin/owner rows.
    if (RANK[row.role] >= RANK.admin && actorRole !== 'owner') return false;
    return RANK[actorRole] >= RANK.admin;
  }

  return (
    <>
      {error && (
        <p className="rounded-lg border border-accent/40 bg-accent-tint p-3 text-sm text-accent-dark">
          {error}
        </p>
      )}

      <div className="card scroll-x">
        <table className="w-full min-w-[42rem] text-sm">
          <thead className="border-b border-line text-left text-muted">
            <tr>
              <th className="p-4 font-normal">Member</th>
              <th className="p-4 font-normal">Role</th>
              <th className="p-4 font-normal">Joined</th>
              <th className="p-4 font-normal">Last seen</th>
              <th className="p-4 text-right font-normal">Change role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => {
              const editable = canEdit(row);
              const isLastOwner = row.role === 'owner' && ownerCount <= 1;

              return (
                <tr key={row.id}>
                  <td className="p-4">
                    <div className="font-medium text-fg">{row.fullName ?? '—'}</div>
                    <div className="text-xs text-muted">{row.email}</div>
                    {row.id === actorId && <span className="chip mt-1">You</span>}
                  </td>
                  <td className="p-4">
                    <span
                      className={`chip capitalize ${
                        RANK[row.role] >= RANK.admin ? 'chip-brand' : ''
                      }`}
                    >
                      {row.role}
                    </span>
                  </td>
                  <td className="p-4 text-muted">{fmt(row.createdAt)}</td>
                  <td className="p-4 text-muted">{row.lastLoginAt ? fmt(row.lastLoginAt) : 'never'}</td>
                  <td className="p-4 text-right">
                    <select
                      value={row.role}
                      disabled={!editable || busy === row.id || isLastOwner}
                      onChange={(e) => changeRole(row.id, e.target.value as Role)}
                      className="field w-36 py-1.5 text-sm disabled:opacity-40"
                      aria-label={`Role for ${row.email}`}
                    >
                      {ROLES.map((r) => (
                        <option
                          key={r}
                          value={r}
                          // Non-owners cannot assign admin/owner.
                          disabled={RANK[r] >= RANK.admin && actorRole !== 'owner'}
                        >
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted">
        Demoting someone signs them out immediately. The last owner cannot be demoted —
        promote a replacement first.
      </p>
    </>
  );
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
