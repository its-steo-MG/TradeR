import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/deriv/close
 * Closes an open contract on the Django Deriv backend
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.contract_id && !body.contractId) {
      return NextResponse.json(
        { success: false, error: 'Missing contract_id' },
        { status: 400 }
      )
    }

    //const backendUrl = process.env.DERIV_BACKEND_URL || 'http://localhost:8001'
    const backendUrl = process.env.DERIV_BACKEND_URL || 'https://traderiserproapp.onrender.com'
    
    
    // Properly extract Authorization header
    const authHeader = request.headers.get('authorization') || 
                       request.headers.get('Authorization') || '';

    // Forward the body as-is (Django expects "contract_id")
    const payload = {
      contract_id: body.contract_id || body.contractId,
      // price: body.price || 0,   // optional - uncomment if needed
    };

    const response = await fetch(`${backendUrl}/api/deriv/sell/`, {   // ← Note: your Django endpoint is /sell/
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      let errorMessage = 'Failed to close contract';
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
    console.error('[Close Contract Proxy] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}