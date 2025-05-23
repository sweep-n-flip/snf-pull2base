import { formatFrameTransaction } from '@/lib/services/farcasterUtils';
import { prepareFramePurchaseTransaction } from '@/lib/services/frameTransactions';
import { MAINNET_NETWORKS } from '@/lib/services/mainnetReservoir';
import { logFrameRequestDetails, logTransactionPreparation } from '@/lib/utils/frameLogging';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Enhanced logging for Farcaster Frame requests
    await logFrameRequestDetails(req, {
      endpoint: 'transaction',
      transactionType: 'nft-purchase'
    });
    
    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    console.log('- Search parameters:', Object.fromEntries(searchParams.entries()));
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

    // In transaction endpoints for Farcaster, we use ${WALLET} placeholder
    // which will be replaced by the Farcaster protocol with the actual user wallet
    
    // Get transaction data from your Reservoir service
    const purchaseData = await prepareFramePurchaseTransaction(
      network,
      contract,
      tokenId,
      '${WALLET}', // This is the correct format for Farcaster transaction endpoint
      req.nextUrl.origin
    );
    
    // Enhanced transaction preparation logging
    logTransactionPreparation(network.name, contract, tokenId, {
      networkId: network.id,
      chainId: network.chainId,
      success: purchaseData.success,
      hasError: !!purchaseData.error,
      hasTxInfo: !!purchaseData.txInfo,
      origin: req.nextUrl.origin
    });
    
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
      // The chainId must include the eip155: prefix
      // see: https://docs.farcaster.xyz/reference/frames/spec#transaction-button-action
      const transactionData = formatFrameTransaction(
        purchaseData.txInfo.chainId,
        purchaseData.txInfo.to,
        purchaseData.txInfo.data,
        purchaseData.txInfo.value
      );
      
      console.log('Returning transaction data to Farcaster:', {
        chainId: transactionData.chainId,
        to: transactionData.to,
        dataLength: transactionData.data.length,
        value: transactionData.value
      });
      
      // Add special debugging headers that might help trace issues
      return NextResponse.json(transactionData, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
          'X-Frame-Transaction': 'true',
          'X-Chain-Id': transactionData.chainId,
          'X-Transaction-To': transactionData.to
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

    // Format and return the transaction data in the format expected by Farcaster Frame
    const transactionData = formatFrameTransaction(
      chainId,
      toAddress,
      data,
      value
    );

    console.log('Returning fallback transaction data to Farcaster:', {
      chainId: transactionData.chainId,
      to: transactionData.to,
      dataLength: transactionData.data.length,
      value: transactionData.value
    });
    
    // Add special debugging headers 
    return NextResponse.json(transactionData, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'X-Frame-Transaction': 'true',
        'X-Chain-Id': transactionData.chainId,
        'X-Transaction-To': transactionData.to
      }
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
