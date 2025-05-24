import { prepareFramePurchaseTransaction } from '@/lib/services/frameTransactions';
import { MAINNET_NETWORKS } from '@/lib/services/mainnetReservoir';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Transaction endpoint for Farcaster Frames
 * This returns transaction data in the format expected by Farcaster Frame's transaction action
 */
export async function GET(req: NextRequest) {
  try {
    console.log('Frame transaction request received:', req.url);

    // Extract parameters
    const url = new URL(req.url);
    const networkId = url.searchParams.get('network');
    const contract = url.searchParams.get('contract');
    const tokenId = url.searchParams.get('tokenId');
    const testWallet = url.searchParams.get('testWallet'); // For testing only
    const fallbackFid = url.searchParams.get('fid'); // For fallback user identification

    // Log parameters for debugging
    console.log('Transaction request parameters:', { networkId, contract, tokenId, testWallet });

    // Validate required parameters
    if (!networkId || !contract || !tokenId) {
      console.error('Missing required parameters');
      return NextResponse.json(
        { 
          error: 'Missing required parameters',
          message: 'The network, contract, and tokenId parameters are required.'
        }, 
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Find the network configuration
    const network = MAINNET_NETWORKS.find(n => n.id.toString() === networkId);
    if (!network) {
      console.error('Invalid network ID:', networkId);
      return NextResponse.json(
        { 
          error: 'Invalid network',
          message: 'The specified network is not supported.'
        }, 
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Define base URL for callbacks
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('host')}`;

    // Set placeholder wallet address for frame transaction
    // This will be replaced by Farcaster Frame with the actual user's wallet
    // Use testWallet for development/testing if provided
    const walletAddress = testWallet && testWallet.startsWith('0x') 
      ? testWallet 
      : '${WALLET}'; // Placeholder that Farcaster Frame will replace

    // Prepare the transaction data using our service
    const purchaseData = await prepareFramePurchaseTransaction(
      network,
      contract,
      tokenId,
      walletAddress,
      baseUrl
    );

    if (!purchaseData.success || !purchaseData.txInfo) {
      console.error('Failed to prepare transaction:', purchaseData.error);
      return NextResponse.json(
        { 
          error: 'Transaction preparation failed',
          message: purchaseData.error || 'Unable to prepare the transaction data.'
        }, 
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Format for Farcaster Frame transaction action
    // https://docs.farcaster.xyz/reference/frames/spec#transaction-button-action
    const txData = purchaseData.txInfo;
    const frameTransactionData = {
      chainId: `eip155:${network.chainId}`,
      method: 'eth_sendTransaction',
      params: {
        to: txData.to,
        data: txData.data,
        value: txData.value || '0',
        // Standard gas parameters can be added here if needed
        // gas: '0x7A120', // Example gas limit
      }
    };

    // Return the transaction data with CORS headers
    return NextResponse.json(frameTransactionData, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Transaction endpoint error:', error instanceof Error ? error.stack : String(error));
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred.'
      }, 
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

// Handle OPTIONS for CORS preflight requests
export async function OPTIONS() {
  return NextResponse.json(
    { success: true },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
      }
    }
  );
}