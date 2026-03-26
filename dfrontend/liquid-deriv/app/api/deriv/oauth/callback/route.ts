import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/deriv/oauth/callback
 * Handles the redirect from Deriv after user logs in.
 * Forwards the code & state to Django backend, which then redirects the browser to the frontend.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code || !state) {
      // Redirect to frontend with error instead of returning JSON
      const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'
      return NextResponse.redirect(
        `${frontendUrl}/deriv-callback?success=false&message=Missing code or state parameter`
      )
    }

    const backendUrl = process.env.DERIV_BACKEND_URL 
      || process.env.NEXT_PUBLIC_BACKEND_URL 
      || 'https://traderiserproapp.onrender.com'

    // Build the Django callback URL with code and state
    const djangoUrl = `${backendUrl}/api/deriv/oauth/callback/?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`

    console.log('🔄 Forwarding OAuth callback to Django:', djangoUrl)

    // Since Django callback now does a redirect (browser redirect), we should let the browser follow it
    // Instead of fetching as JSON, we redirect the user directly to Django's callback endpoint
    return NextResponse.redirect(djangoUrl)

  } catch (error) {
    console.error('[OAuth Callback Proxy] Error:', error)
    
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'
    return NextResponse.redirect(
      `${frontendUrl}/deriv-callback?success=false&message=Internal server error during callback`
    )
  }
}