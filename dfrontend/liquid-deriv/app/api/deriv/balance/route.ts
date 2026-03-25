import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/deriv/balance
 * Proxies balance request to Django backend with proper JWT forwarding
 */
export async function GET(request: NextRequest) {
  try {
    //const backendUrl = process.env.DERIV_BACKEND_URL || 'http://localhost:8001'
    const backendUrl = process.env.DERIV_BACKEND_URL || 'https://traderiserproapp.onrender.com'

    // Properly extract Authorization header (handles both 'authorization' and 'Authorization')
    const authHeader = request.headers.get('authorization') || 
                       request.headers.get('Authorization') || 
                       '';

    const response = await fetch(`${backendUrl}/api/deriv/balance/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,   // Forward exactly what came from frontend
      },
    })

    if (!response.ok) {
      let errorMessage = 'Failed to fetch balance';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
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

    return NextResponse.json({
      success: true,
      ...data,                    // Pass through whatever Django returns
    });

  } catch (error) {
    console.error('[Balance Proxy] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}