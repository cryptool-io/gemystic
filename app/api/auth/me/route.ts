import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth/session';

export const runtime = 'nodejs';

/**
 * Session probe for client components. The root layout is static (so the
 * catalogue prerenders); the header AccountMenu asks here after mount instead
 * of receiving the user via server props.
 */
export async function GET() {
  const user = await currentUser();
  return NextResponse.json({ user });
}
