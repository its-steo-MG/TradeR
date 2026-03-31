// app/api/deriv/oauth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
  const backendUrl = process.env.DERIV_BACKEND_URL || 'https://traderiserproapp.onrender.com';

  if (error) {
    return NextResponse.redirect(
      `${frontendUrl}/deriv-callback?success=false&message=${encodeURIComponent(`Deriv: ${error}`)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${frontendUrl}/deriv-callback?success=false&message=Missing code or state`
    );
  }

  try {
    const djangoUrl = `${backendUrl}/api/deriv/oauth/callback/?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;

    const djangoRes = await fetch(djangoUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'manual',
    });

    // Django should return 302 with Location header
    if (djangoRes.status === 302 || djangoRes.status === 301) {
      const location = djangoRes.headers.get('location');
      if (location) {
        return NextResponse.redirect(location);
      }
    }

    // Fallback
    const text = await djangoRes.text();
    return NextResponse.redirect(
      `${frontendUrl}/deriv-callback?success=false&message=Backend error: ${encodeURIComponent(text)}`
    );

  } catch (err) {
    console.error('[Callback Proxy] Error:', err);
    return NextResponse.redirect(
      `${frontendUrl}/deriv-callback?success=false&message=Connection error to backend`
    );
  }
}