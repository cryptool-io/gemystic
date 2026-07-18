import { requireRole } from '@/lib/auth/guard';
import { userStore } from '@/lib/auth/store';
import { TeamTable } from '@/components/admin/TeamTable';

export default async function TeamPage() {
  const actor = await requireRole('staff', '/admin/team');
  const users = await userStore().listUsers();

  const rows = users
    .map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Team</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Everyone with an account. Change a role to grant or remove access. Staff can see
          the admin portal; admins can manage the catalogue and orders; the owner can create
          other admins. To add a team member, have them register at{' '}
          <code className="rounded-sm bg-surface-2 px-1.5 py-0.5 text-brand-dark">/register</code>,
          then set their role here.
        </p>
      </div>

      <TeamTable rows={rows} actorId={actor.id} actorRole={actor.role} />
    </div>
  );
}
