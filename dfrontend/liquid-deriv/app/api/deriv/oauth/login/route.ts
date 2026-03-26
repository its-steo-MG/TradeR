import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/deriv/oauth/login
 * Returns the Deriv OAuth login URL from Django backend
 * Now passes the current frontend origin so Django knows where to redirect after callback
 */
export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.DERIV_BACKEND_URL 
      || 'https://traderiserproapp.onrender.com'

    // Get current frontend origin (this is crucial for multi-frontend support)
    const frontendOrigin = process.env.NEXT_PUBLIC_FRONTEND_URL 
      || request.headers.get('origin') 
      || request.nextUrl.origin

    console.log(`[OAuth Login] Request from frontend: ${frontendOrigin}`)

    // Forward the request to Django, passing the frontend origin as query param
    const djangoLoginUrl = new URL(`${backendUrl}/api/deriv/oauth/login/`)
    
    // Pass frontend origin so Django can remember which frontend initiated the flow
    djangoLoginUrl.searchParams.append('frontend_url', frontendOrigin)

    const response = await fetch(djangoLoginUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // IMPORTANT: No Authorization header - this must remain public (AllowAny)
      },
    })

    if (!response.ok) {
      let errorMessage = 'Failed to get Deriv login URL';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        const errorText = await response.text();
        errorMessage = errorText || errorMessage;
      }

      console.error('[OAuth Login] Django error:', errorMessage);
      
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      auth_url: data.auth_url,
      message: data.message || 'Redirect to Deriv to login',
    });

  } catch (error) {
    console.error('[OAuth Login Proxy] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error during login request' 
      },
      { status: 500 }
    );
  }
}