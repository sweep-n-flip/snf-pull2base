import { prepareFramePurchaseTransaction } from '@/lib/services/frameTransactions';
import { MAINNET_NETWORKS } from '@/lib/services/mainnetReservoir';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Log complete request for debugging
    console.log('Transaction endpoint called:');
    console.log('- Method:', req.method);
    console.log('- URL:', req.url);
    
    // Log headers safely
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log('- Headers:', JSON.stringify(headers, null, 2));
    
    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const networkId = searchParams.get('network') || '';
    const contract = searchParams.get('contract') || '';
    const tokenId = searchParams.get('tokenId') || '';
    
    console.log('Transaction request received:', { networkId, contract, tokenId });

    // Find the network
    const network = MAINNET_NETWORKS.find(n => n.id.toString() === networkId);
    
    if (!network || !contract || !tokenId) {
      console.error('Missing required parameters for transaction:', { networkId, contract, tokenId });
      return NextResponse.json({
        error: 'Missing required parameters'
      }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    }

    // Get transaction data from your Reservoir service
    const purchaseData = await prepareFramePurchaseTransaction(
      network,
      contract,
      tokenId,
      '${WALLET}', // Farcaster will replace this placeholder with the actual wallet address
      req.nextUrl.origin
    );
    
    if (!purchaseData.success) {
      console.error('Failed to prepare transaction data:', purchaseData.error);
      return NextResponse.json({
        error: purchaseData.error || 'Failed to prepare transaction'
      }, { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    }

    // Check if we have the raw transaction data in txInfo
    if (purchaseData.txInfo && 
        purchaseData.txInfo.to && 
        purchaseData.txInfo.data) {
      
      // Use the txInfo data directly
      console.log('Using transaction data from txInfo:', {
        to: purchaseData.txInfo.to,
        chainId: `eip155:${purchaseData.txInfo.chainId}`,
        dataLength: purchaseData.txInfo.data.length,
        value: purchaseData.txInfo.value
      });
      
      // Return transaction data in the format expected by Farcaster Frame
      const transactionData = {
        chainId: `eip155:${purchaseData.txInfo.chainId}`,
        to: purchaseData.txInfo.to,
        data: purchaseData.txInfo.data,
        value: purchaseData.txInfo.value
      };
      
      console.log('Returning transaction data to Farcaster:', {
        chainId: transactionData.chainId,
        to: transactionData.to,
        dataLength: transactionData.data.length,
        value: transactionData.value
      });
      
      return NextResponse.json(transactionData, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Fallback to parsing from txUrl if txInfo is not available
    if (!purchaseData.txUrl) {
      console.error('No transaction URL or data available');
      return NextResponse.json({
        error: 'No transaction data available'
      }, { status: 500 });
    }

    // Extract transaction data from the txUrl
    // Example URL format: ethereum:0x1234...@1/call?data=0x5678...&value=0x0
    const txUrlParts = purchaseData.txUrl.split('@');
    if (txUrlParts.length < 2) {
      console.error('Invalid transaction URL format:', purchaseData.txUrl);
      return NextResponse.json({
        error: 'Invalid transaction URL format'
      }, { status: 500 });
    }
    
    // Extract contract address
    const toAddress = txUrlParts[0].replace('ethereum:', '');
    
    // Extract chain ID and parameters
    const chainAndParams = txUrlParts[1].split('/call?');
    if (chainAndParams.length < 2) {
      console.error('Invalid transaction parameters format:', chainAndParams);
      return NextResponse.json({
        error: 'Invalid transaction parameters'
      }, { status: 500 });
    }
    
    const chainId = chainAndParams[0];
    
    // Parse the parameters
    const params = new URLSearchParams(chainAndParams[1]);
    const data = params.get('data') || '0x';
    const value = params.get('value') || '0';
    
    console.log('Extracted transaction data from URL:', {
      to: toAddress,
      chainId: `eip155:${chainId}`,
      dataLength: data.length,
      value
    });

    // Return the transaction data in the format expected by Farcaster Frame
    return NextResponse.json({
      chainId: `eip155:${chainId}`,
      to: toAddress,
      data,
      value
    });
  } catch (error) {
    console.error('Error generating transaction data:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({
      error: 'Error generating transaction data'
    }, { 
      status: 500, 
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }
}
