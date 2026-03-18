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

  response.cookies.set('inventory_platform_session', '', cookieOptions);
  response.cookies.set('user_id', '', cookieOptions);
  response.cookies.set('user_role', '', cookieOptions);
  response.cookies.set('user_status', '', cookieOptions);
  response.cookies.set('user_email', '', cookieOptions);
  response.cookies.set('user_name', '', cookieOptions);
  response.cookies.set('user_department', '', cookieOptions);
  response.cookies.set('user_employee_id', '', cookieOptions);

  return response;
}