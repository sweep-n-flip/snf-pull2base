import { prepareFramePurchaseTransaction } from '@/lib/services/frameTransactions';
import { MAINNET_NETWORKS } from '@/lib/services/mainnetReservoir';
import { formatFrameTransaction } from '@/lib/utils/frameSDK';
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
    const chainIdParam = url.searchParams.get('chainId'); // Nova opção para passar chainId diretamente
    const contract = url.searchParams.get('contract');
    const tokenId = url.searchParams.get('tokenId');
    const testWallet = url.searchParams.get('testWallet'); // For testing only
    const fallbackFid = url.searchParams.get('fid'); // For fallback user identification

    // Log parameters for debugging
    console.log('Transaction request parameters:', { 
      networkId, 
      chainId: chainIdParam,
      contract, 
      tokenId, 
      testWallet 
    });

    // Validate required parameters
    if (!networkId || !contract || !tokenId) {
      console.error('Missing required parameters');
      return NextResponse.json(
        { 
          error: 'Missing required parameters',
          required: ['network', 'contract', 'tokenId'],
          received: { networkId, contract, tokenId }
        }, 
        { 
          status: 400,
          headers: getCorsHeaders(req)
        }
      );
    }

    // Find the network configuration
    const network = MAINNET_NETWORKS.find(n => n.id.toString() === networkId);
    if (!network) {
      console.error('Invalid network ID:', networkId);
      return NextResponse.json(
        { 
          error: 'Unsupported network',
          networkId,
          supportedNetworks: MAINNET_NETWORKS.map(n => ({ id: n.id, name: n.name }))
        }, 
        { 
          status: 400,
          headers: getCorsHeaders(req)
        }
      );
    }

    // Define base URL for callbacks
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('host')}`;

    // Set placeholder wallet address for frame transaction
    // This will be replaced by Farcaster Frame with the actual user's wallet
    const walletAddress = testWallet && testWallet.startsWith('0x') 
      ? testWallet 
      : '${WALLET}'; // Placeholder padrão do Farcaster

    console.log('Using wallet address:', walletAddress === '${WALLET}' ? 'PLACEHOLDER' : walletAddress);

    // Prepare the transaction data using our service
    console.log(`Iniciando preparação de transação para NFT ${contract}:${tokenId} na rede ${network.name} (${network.chainId})`);
    const purchaseData = await prepareFramePurchaseTransaction(
      network,
      contract,
      tokenId,
      walletAddress,
      baseUrl
    );
    
    console.log('Resultado da preparação de transação:', {
      success: purchaseData.success,
      hasError: !!purchaseData.error,
      errorMsg: purchaseData.error,
      hasNft: !!purchaseData.nft,
      hasTxInfo: !!purchaseData.txInfo,
      price: purchaseData.price,
      currency: purchaseData.currency
    });

    if (!purchaseData.success || !purchaseData.txInfo) {
      console.error('Failed to prepare transaction:', purchaseData.error);
      
      // Se o NFT não estiver à venda, retornar um 400 em vez de um 500
      // pois é um erro de negócio, não técnico
      const statusCode = purchaseData.error === 'NFT not for sale' ? 400 : 500;
      
      return NextResponse.json(
        { 
          error: 'Transaction preparation failed',
          message: purchaseData.error || 'Unable to prepare the transaction data.',
          details: {
            hasNft: !!purchaseData.nft,
            hasTxInfo: !!purchaseData.txInfo,
            price: purchaseData.price,
            currency: purchaseData.currency
          }
        }, 
        { 
          status: statusCode,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Validar dados da transação
    const txInfo = purchaseData.txInfo;
    if (!txInfo.to || !txInfo.data) {
      console.error('Invalid transaction data:', txInfo);
      return NextResponse.json(
        { 
          error: 'Invalid transaction data',
          message: 'Transaction data is missing required fields'
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

    // Format for Farcaster Frame transaction action using our utility function
    // https://docs.farcaster.xyz/reference/frames/spec#transaction-button-action
    
    // Usar nosso utilitário para formatar corretamente a transação
    const frameTransactionData = formatFrameTransaction(
      {
        to: txInfo.to,
        data: txInfo.data,
        value: txInfo.value || '0'
      },
      network.chainId
    );

    // Validar formato dos dados da transação
    if (!frameTransactionData.params.to.startsWith('0x')) {
      console.error('Invalid "to" address format:', frameTransactionData.params.to);
      return NextResponse.json(
        { error: 'Invalid transaction "to" address format' },
        { 
          status: 500,
          headers: getCorsHeaders(req)
        }
      );
    }

    if (!frameTransactionData.params.data.startsWith('0x')) {
      console.error('Invalid data format:', frameTransactionData.params.data);
      return NextResponse.json(
        { error: 'Invalid transaction data format' },
        { 
          status: 500,
          headers: getCorsHeaders(req)
        }
      );
    }

    console.log('Returning frame transaction data:', {
      chainId: frameTransactionData.chainId,
      to: frameTransactionData.params.to,
      dataLength: frameTransactionData.params.data?.length || 0,
      value: frameTransactionData.params.value,
      method: frameTransactionData.method
    });

    // Log transaction data before returning
    console.log('Transaction data formatted successfully:', {
      chainId: frameTransactionData.chainId,
      method: frameTransactionData.method,
      to: frameTransactionData.params.to,
      valueType: typeof frameTransactionData.params.value,
      valueHex: frameTransactionData.params.value,
      dataLength: frameTransactionData.params.data?.length || 0
    });

    // Return the transaction data with proper CORS headers
    return NextResponse.json(frameTransactionData, {
      headers: getCorsHeaders(req)
    });

  } catch (error) {
    console.error('Transaction endpoint error:', error instanceof Error ? error.stack : String(error));
    console.log('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : typeof error
    });
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred.'
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