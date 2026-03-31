import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/deriv/oauth/login
 * Returns the Deriv OAuth login URL from Django backend
 * Improved version with better error handling and logging
 */
export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.DERIV_BACKEND_URL || 'https://traderiserproapp.onrender.com';

    // Get current frontend origin - this is crucial for correct redirect after OAuth
    const frontendOrigin = 
      process.env.NEXT_PUBLIC_FRONTEND_URL || 
      request.headers.get('origin') || 
      request.nextUrl.origin;

    console.log(`[OAuth Login] Request received from frontend: ${frontendOrigin}`);

    // Build Django login URL
    const djangoLoginUrl = new URL(`${backendUrl}/api/deriv/oauth/login/`);
    
    // Pass frontend origin so Django can remember where to redirect after callback
    djangoLoginUrl.searchParams.append('frontend_url', frontendOrigin);

    // Optional: pass prompt parameter if needed
    const prompt = request.nextUrl.searchParams.get('prompt') || 'consent';
    djangoLoginUrl.searchParams.append('prompt', prompt);

    console.log(`[OAuth Login] Forwarding to Django: ${djangoLoginUrl.toString()}`);

    const response = await fetch(djangoLoginUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // No Authorization - this endpoint must be public (AllowAny in Django)
      },
      cache: 'no-store',           // Important: don't cache OAuth URLs
    });

    if (!response.ok) {
      let errorMessage = 'Failed to get Deriv login URL from backend';
      let errorDetails = '';

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
        errorDetails = JSON.stringify(errorData);
      } catch {
        const errorText = await response.text();
        errorMessage = errorText || errorMessage;
        errorDetails = errorText;
      }

      console.error(`[OAuth Login] Django returned ${response.status}:`, errorMessage, errorDetails);
      
      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage,
          details: errorDetails 
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.success || !data.auth_url) {
      console.error('[OAuth Login] Invalid response from Django:', data);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid response from backend - no auth_url received' 
        },
        { status: 500 }
      );
    }

    console.log(`[OAuth Login] Successfully received auth_url from Django`);

    return NextResponse.json({
      success: true,
      auth_url: data.auth_url,
      message: data.message || 'Redirecting to Deriv for login...',
    });

  } catch (error) {
    console.error('[OAuth Login Proxy] Unexpected error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error 
          ? error.message 
          : 'Internal server error during OAuth login request' 
      },
      { status: 500 }
    );
  }
}