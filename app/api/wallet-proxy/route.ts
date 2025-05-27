import { NextRequest, NextResponse } from 'next/server';

// Allowed Farcaster wallet service URLs
const ALLOWED_WALLET_URLS = [
  'https://client.warpcast.com/v2/wallet/resource',
  'https://wallet.farcaster.xyz/api/transaction',
  'https://client.warpcast.com/v2/authenticateWithWallet',
  'https://client.warpcast.com/v2/wallet/balance',
  'https://client.warpcast.com/v2/wallet/transactions',
];

// CORS origins that are allowed to use this proxy
const ALLOWED_ORIGINS = [
  'https://wallet.farcaster.xyz',
  'https://client.warpcast.com',
  'https://warpcast.com',
  'https://farcaster.xyz'
];

function getCorsHeaders(req: NextRequest) {
  const origin = req.headers.get('origin') || '';
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin) || !origin;
  const corsOrigin = isAllowedOrigin ? origin : '*';
  
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, X-Farcaster-Wallet-Token',
    'Access-Control-Allow-Credentials': isAllowedOrigin ? 'true' : 'false',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
  };
}

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({ success: true }, {
    headers: getCorsHeaders(req)
  });
}

export async function GET(req: NextRequest) {
  return handleProxyRequest(req);
}

export async function POST(req: NextRequest) {
  return handleProxyRequest(req);
}

export async function PUT(req: NextRequest) {
  return handleProxyRequest(req);
}

export async function DELETE(req: NextRequest) {
  return handleProxyRequest(req);
}

async function handleProxyRequest(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');
    
    if (!targetUrl) {
      return NextResponse.json(
        { error: 'Missing target URL parameter' },
        { 
          status: 400,
          headers: getCorsHeaders(req)
        }
      );
    }

    // Validate that the target URL is allowed
    const isAllowedUrl = ALLOWED_WALLET_URLS.some(allowedUrl => 
      targetUrl.startsWith(allowedUrl)
    );

    if (!isAllowedUrl) {
      return NextResponse.json(
        { error: 'Target URL not allowed' },
        { 
          status: 403,
          headers: getCorsHeaders(req)
        }
      );
    }

    // Prepare headers for the proxied request
    const proxyHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      'User-Agent': 'Farcaster-Frame-Proxy/1.0',
    };

    // Forward specific headers from the original request
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      proxyHeaders['Authorization'] = authHeader;
    }

    const walletTokenHeader = req.headers.get('x-farcaster-wallet-token');
    if (walletTokenHeader) {
      proxyHeaders['X-Farcaster-Wallet-Token'] = walletTokenHeader;
    }

    // Prepare the request options
    const requestOptions: RequestInit = {
      method: req.method,
      headers: proxyHeaders,
    };

    // Add body for POST, PUT requests
    if (req.method === 'POST' || req.method === 'PUT') {
      try {
        const body = await req.text();
        if (body) {
          requestOptions.body = body;
        }
      } catch (error) {
        console.error('Error reading request body:', error);
      }
    }

    // Make the proxied request
    const response = await fetch(targetUrl, requestOptions);
    
    // Get the response data
    let responseData;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch (error) {
        responseData = { error: 'Invalid JSON response from target service' };
      }
    } else {
      responseData = { data: await response.text() };
    }

    // Return the proxied response with CORS headers
    return NextResponse.json(responseData, {
      status: response.status,
      headers: {
        ...getCorsHeaders(req),
        // Forward some response headers
        'X-Proxy-Status': response.status.toString(),
        'X-Proxy-Target': targetUrl,
      }
    });

  } catch (error) {
    console.error('Wallet proxy error:', error);
    
    return NextResponse.json(
      { 
        error: 'Proxy request failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: getCorsHeaders(req)
      }
    );
  }
}
