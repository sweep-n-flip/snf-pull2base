import { NextRequest, NextResponse } from 'next/server';

// CORS allowed origins - extend this list as needed
const ALLOWED_ORIGINS = [
  'https://wallet.farcaster.xyz',
  'https://client.warpcast.com',
  'https://warpcast.com',
  'https://farcaster.xyz'
];

/**
 * Helper function to get CORS headers
 */
function getCorsHeaders(req: NextRequest) {
  const origin = req.headers.get('origin') || '';
  
  // Determine if the origin is allowed
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin) || !origin;
  const corsOrigin = isAllowedOrigin ? origin : '*';
  
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
    'Access-Control-Allow-Credentials': isAllowedOrigin ? 'true' : 'false',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
  };
}


// Transaction endpoint now redirects users to miniapp instead of processing transactions
export async function GET(req: NextRequest) {
  try {
    console.log('Frame transaction request received - redirecting to miniapp:', req.url);

    // Extract parameters
    const url = new URL(req.url);
    const networkId = url.searchParams.get('network');
    const contract = url.searchParams.get('contract');
    const tokenId = url.searchParams.get('tokenId');

    // Log parameters for debugging
    console.log('Transaction request parameters:', { 
      networkId,
      contract, 
      tokenId 
    });

    // Validate required parameters
    if (!networkId || !contract || !tokenId) {
      console.error('Missing required parameters');
      return NextResponse.json(
        { 
          error: 'Missing required parameters',
          message: 'Please use the miniapp to complete your purchase',
          required: ['network', 'contract', 'tokenId'],
          received: { networkId, contract, tokenId }
        }, 
        { 
          status: 400,
          headers: getCorsHeaders(req)
        }
      );
    }

    // Define base URL for redirection
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('host')}`;
    
    const buyUrl = `${baseUrl}?tab=marketplace&network=${networkId}&contract=${contract}&tokenId=${tokenId}`;

    // Return redirect message instead of transaction data
    return NextResponse.json(
      { 
        error: 'Transaction not available in frames',
        message: 'Please use the miniapp to complete your NFT purchase',
        redirectUrl: buyUrl,
        action: 'redirect_to_miniapp',
        details: {
          networkId,
          contract,
          tokenId,
          buyUrl
        }
      }, 
      { 
        status: 400,
        headers: getCorsHeaders(req)
      }
    );

  } catch (error) {
    console.error('Transaction endpoint error:', error instanceof Error ? error.stack : String(error));
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Please use the miniapp to complete your purchase',
        details: error instanceof Error ? error.message : 'An unexpected error occurred.'
      }, 
      { 
        status: 500,
        headers: getCorsHeaders(req)
      }
    );
  }
}

// Handle OPTIONS for CORS preflight requests
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') || '';
  
  // Determine if the origin is allowed
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin) || !origin;
  const corsOrigin = isAllowedOrigin ? origin : ALLOWED_ORIGINS[0];
  
  return NextResponse.json(
    { success: true },
    {
      headers: {
        'Access-Control-Allow-Origin': corsOrigin || '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400', // 24 hours
        'Content-Type': 'application/json'
      }
    }
  );
}