// app/api/deriv/oauth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';

  // Handle error from Deriv directly
  if (error) {
    console.error(`[OAuth Callback] Deriv returned error: ${error}`);
    return NextResponse.redirect(
      `${frontendUrl}/deriv-callback?success=false&message=${encodeURIComponent(`Deriv error: ${error}`)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${frontendUrl}/deriv-callback?success=false&message=Missing code or state parameter`
    );
  }

  const backendUrl = process.env.DERIV_BACKEND_URL || 'https://traderiserproapp.onrender.com';

  try {
    console.log(`[OAuth Callback] Forwarding code to Django backend...`);

    const djangoUrl = new URL(`${backendUrl}/api/deriv/oauth/callback/`);
    djangoUrl.searchParams.append('code', code);
    djangoUrl.searchParams.append('state', state);

    const djangoRes = await fetch(djangoUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',        // Important for session
      redirect: 'manual',            // ← Key: Don't auto-follow redirects
    });

    // If Django returns a redirect (302), we extract the Location header
    if (djangoRes.status === 302 || djangoRes.status === 301) {
      const location = djangoRes.headers.get('location');
      
      if (location) {
        console.log(`[OAuth Callback] Django wants to redirect to: ${location}`);
        // Since location is already the frontend URL, we can redirect directly
        return NextResponse.redirect(location);
      }
    }

    // If Django returned JSON or success status
    if (djangoRes.ok) {
      try {
        const data = await djangoRes.json();
        const success = data.success !== false;
        const message = data.message || (success ? 'Deriv account connected successfully' : 'Unknown error');

        return NextResponse.redirect(
          `${frontendUrl}/deriv-callback?success=${success}&message=${encodeURIComponent(message)}`
        );
      } catch {
        // If not JSON, assume success
        return NextResponse.redirect(
          `${frontendUrl}/deriv-callback?success=true&message=Deriv account connected successfully`
        );
      }
    }

    // Django returned error status
    const errorText = await djangoRes.text().catch(() => 'Unknown backend error');
    console.error(`[OAuth Callback] Django error ${djangoRes.status}:`, errorText);

    return NextResponse.redirect(
      `${frontendUrl}/deriv-callback?success=false&message=Backend error: ${encodeURIComponent(errorText)}`
    );

  } catch (err) {
    console.error('[OAuth Callback Proxy] Unexpected error:', err);
    return NextResponse.redirect(
      `${frontendUrl}/deriv-callback?success=false&message=Internal proxy error during callback`
    );
  }
}