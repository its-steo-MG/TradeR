import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/deriv/oauth/login
 * Returns the Deriv OAuth login URL (public route - no authentication required)
 */
export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.DERIV_BACKEND_URL || 'http://localhost:8001'

    // This route must be PUBLIC → Do NOT forward any Authorization header
    const response = await fetch(`${backendUrl}/api/deriv/oauth/login/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // No Authorization header here - Django expects AllowAny
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

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Pass through the auth_url from Django
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
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}