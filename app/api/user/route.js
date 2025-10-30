// app/api/user/route.js
import { cookies } from 'next/headers';
import { getSession } from '@/lib/session-store';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('auth')?.value;  // ← Change this to 'auth'
    console.log('🔑 Session ID from cookie:', sessionId);

    if (!sessionId) {
      console.log('❌ No auth cookie found');
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const session = await getSession(sessionId);
    console.log('📦 Session data from Redis:', session);

    if (!session) {
      console.log('❌ Session not found in Redis');
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        name: session.user.name,
        email: session.user.email,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching user:', error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}