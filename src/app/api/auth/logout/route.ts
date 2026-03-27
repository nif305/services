import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ ok: true });

  const cookieOptions = {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: true,
    path: '/',
    expires: new Date(0),
  };

  const cookiesToClear = [
    'inventory_platform_session',
    'user_id',
    'user_role',
    'user_roles',
    'user_status',
    'user_email',
    'user_name',
    'user_department',
    'user_employee_id',
    'active_role',
  ];

  for (const cookieName of cookiesToClear) {
    response.cookies.set(cookieName, '', cookieOptions);
  }

  return response;
}
