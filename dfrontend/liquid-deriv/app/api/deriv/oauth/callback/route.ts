import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.DERIV_BACKEND_URL 
      || process.env.NEXT_PUBLIC_BACKEND_URL 
      || 'https://traderiserproapp.onrender.com'

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code || !state) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Missing code or state parameter. This endpoint should only be called by Deriv after login." 
        },
        { status: 400 }
      )
    }

    // Forward to Django backend
    const djangoUrl = `${backendUrl}/api/deriv/oauth/callback/?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`

    const djangoResponse = await fetch(djangoUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

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