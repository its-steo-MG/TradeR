// app/api/deriv/oauth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://traderiserdigister.vercel.app'
  const backendUrl = process.env.DERIV_BACKEND_URL || 'https://traderiserproapp.onrender.com'

  if (error) {
    return NextResponse.redirect(
      `${frontendUrl}/deriv-callback?success=false&message=${encodeURIComponent(`Deriv error: ${error}`)}`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${frontendUrl}/deriv-callback?success=false&message=Missing code or state`
    )
  }

  try {
    const djangoUrl = `${backendUrl}/api/deriv/oauth/callback/?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`

    const djangoRes = await fetch(djangoUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'manual',
    })

    // Handle Django redirect (302)
    if (djangoRes.status === 302 || djangoRes.status === 301) {
      const location = djangoRes.headers.get('location')
      if (location) return NextResponse.redirect(location)
    }

    // Fallback
    return NextResponse.redirect(
      `${frontendUrl}/deriv-callback?success=false&message=Backend did not return redirect`
    )

  } catch (err) {
    console.error('[Callback Proxy] Error:', err)
    return NextResponse.redirect(
      `${frontendUrl}/deriv-callback?success=false&message=Failed to connect to backend`
    )
  }
}