import { NextRequest, NextResponse } from 'next/server'
import type { Proposal } from '@/lib/types'

/**
 * POST /api/deriv/proposal
 * Proxies proposal requests to the Django Deriv backend
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields (match what your Django view expects)
    if (!body.symbol || !body.contract_type || !body.amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: symbol, contract_type, amount' },
        { status: 400 }
      )
    }

    //const backendUrl = process.env.DERIV_BACKEND_URL || 'http://localhost:8001'
    const backendUrl = process.env.DERIV_BACKEND_URL || 'https://traderiserproapp.onrender.com'

    // Properly extract Authorization header
    const authHeader = request.headers.get('authorization') || 
                       request.headers.get('Authorization') || '';

    // Forward the body with correct field names for Django
    const payload = {
      symbol: body.symbol,
      contract_type: body.contract_type || body.contractType,
      amount: body.amount || body.stake,
      duration: body.duration,
      duration_unit: body.duration_unit || body.durationUnit,
      // Add any other fields you want to pass through
    };

    const response = await fetch(`${backendUrl}/api/deriv/proposal/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      let errorMessage = 'Failed to fetch proposal';
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
    console.error('[Proposal Proxy] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}