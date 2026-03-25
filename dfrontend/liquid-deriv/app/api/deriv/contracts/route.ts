import { NextRequest, NextResponse } from 'next/server'
import type { OpenContract } from '@/lib/types'

/**
 * GET /api/deriv/contracts
 * Fetches open contracts from the Django Deriv backend
 */
export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.DERIV_BACKEND_URL || 'http://localhost:8001'

    // Properly extract Authorization header (handles both casing)
    const authHeader = request.headers.get('authorization') || 
                       request.headers.get('Authorization') || '';

    const response = await fetch(`${backendUrl}/api/deriv/open-contract/`, {   // ← Fixed endpoint
      method: 'POST',   // Your Django view is POST, not GET
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        contract_id: null,        // null = get all open contracts (or adjust as needed)
        subscribe: false,
      }),
    })

    if (!response.ok) {
      let errorMessage = 'Failed to fetch contracts';
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

    // Normalize response
    const contracts = data.contract || 
                     (Array.isArray(data) ? data : []) || 
                     [];

    return NextResponse.json({
      success: true,
      contracts,
    });

  } catch (error) {
    console.error('[Contracts Proxy] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}