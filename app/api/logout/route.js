// pages/api/logout.js
import { serialize } from 'cookie';

export async function POST(req) {
  // Clear the cookie by setting it to empty and expiring it immediately
  const cookie = serialize('auth', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    expires: new Date(0),
    path: '/',
  });

  return new Response(JSON.stringify({ message: 'Logout successful' }), {
    status: 200,
    headers: {
      'Set-Cookie': cookie,
      'Content-Type': 'application/json',
    },
  });
}