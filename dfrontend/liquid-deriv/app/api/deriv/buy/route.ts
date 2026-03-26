import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/deriv/buy
 * Proxies buy requests to the Django Deriv backend with proper JWT forwarding
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Better validation
    if (!body.contract_type || !body.symbol || !body.amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: contract_type, symbol, amount' },
        { status: 400 }
      )
    }

    const backendUrl = process.env.DERIV_BACKEND_URL || 'http://localhost:8001'
    
    
    // Properly extract Authorization header (handles both cases)
    const authHeader = request.headers.get('authorization') || 
                       request.headers.get('Authorization') || '';

    const response = await fetch(`${backendUrl}/api/deriv/buy/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(body),   // Forward the original body as-is
    })

    if (!response.ok) {
      let errorMessage = 'Failed to buy contract';
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
      ...data,
    });

  } catch (error) {
    console.error('[Buy Proxy] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}