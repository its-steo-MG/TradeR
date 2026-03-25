import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/deriv/oauth/callback
 * Proxy the callback from Deriv to your Django backend
 */
export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.DERIV_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://traderiserproapp.onrender.com'

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code || !state) {
      return NextResponse.json(
        { success: false, message: 'Missing code or state' },
        { status: 400 }
      )
    }

    // Forward to Django callback
    const djangoResponse = await fetch(
      `${backendUrl}/api/deriv/oauth/callback/?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
      {
        method: 'GET',
        credentials: 'include',   // Important for Django session (PKCE)
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    const data = await djangoResponse.json()

    return NextResponse.json(data, { status: djangoResponse.status })

  } catch (error) {
    console.error('[OAuth Callback Proxy] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error during callback' },
      { status: 500 }
    )
  }
}