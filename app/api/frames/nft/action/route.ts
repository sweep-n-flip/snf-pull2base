import { prepareFramePurchaseTransaction } from '@/lib/services/frameTransactions';
import { MAINNET_NETWORKS } from '@/lib/services/mainnetReservoir';
import { trackReservoirTransaction } from '@/lib/services/reservoirTx';
import { verifySignature } from '@/lib/utils/signatureVerification';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    let stateBase64: string = '';
    let buttonId: string = '';
    let trustedData: string = '';
    let untrustedData: string = '';
    
    // Check if it's a form submission
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('form')) {
      // Process as form data
      try {
        const formData = await req.formData();
        stateBase64 = formData.get('state') as string || '';
        buttonId = formData.get('buttonIndex') as string || '';
        trustedData = formData.get('trustedData.messageBytes') as string || '';
        untrustedData = formData.get('untrustedData') as string || '';
      } catch (error) {
        console.error('Error processing form data:', error);
      }
    } else {
      // Try to process as JSON 
      try {
        const jsonData = await req.json();
        stateBase64 = jsonData.state || '';
        buttonId = jsonData.buttonIndex || '';
        trustedData = jsonData.trustedData?.messageBytes || '';
        untrustedData = jsonData.untrustedData || '';
      } catch (error) {
        console.error('Error processing JSON data:', error);
        // Try to get parameters from URL if all else fails
        const url = new URL(req.url);
        stateBase64 = url.searchParams.get('state') || '';
        buttonId = url.searchParams.get('buttonIndex') || '';
      }
    }
    // Extract user data from frame interaction
    let userAddress = '';
    
    if (trustedData) {
      try {
        // Verify the trusted data signature
        const verified = await verifySignature(trustedData);
        if (!verified) {
          throw new Error('Invalid signature in trusted data');
        }
        console.log('Trusted data verified successfully');
      } catch (error) {
        console.error('Error verifying trusted data:', error instanceof Error ? error.message : String(error));
      }
    }

    if (untrustedData) {
      try {
        // Parse untrusted data - contains user's FID and connected address
        const untrustedDataJson = JSON.parse(untrustedData);
        if (untrustedDataJson?.address) {
          userAddress = untrustedDataJson.address;
          console.log('User address from untrusted data:', userAddress);
        } else {
          console.log('No address found in untrustedData:', untrustedData);
        }
      } catch (error) {
        console.error('Error parsing untrusted data:', error instanceof Error ? error.message : String(error));
      }
    }
    
    if (!buttonId) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <meta property="fc:frame" content="vNext">
            <meta property="fc:frame:image" content="${req.nextUrl.origin}/logo.png">
            <meta property="fc:frame:title" content="Error">
            <meta property="fc:frame:post_url" content="${req.nextUrl.origin}/api/frames/nft/action">
            <meta property="fc:frame:button:1" content="Try Again">
          </head>
          <body>
            <p>Error: Invalid button index</p>
          </body>
        </html>`,
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'text/html'
          }
        }
      );
    }
    
    // Define interface for state to help TypeScript
    interface FrameState {
      networkId?: string;
      contract?: string;
      tokenId?: string;
      action?: string; 
      image?: string;
      name?: string;
      title?: string;
      txHash?: string;  // Added for transaction tracking
    }

    let state: FrameState = {};
    if (stateBase64) {
      try {
        const stateJson = Buffer.from(stateBase64, 'base64').toString();
        state = JSON.parse(stateJson);
      } catch (error) {
        console.error('Error parsing state:', error);
      }
    }
    
    const { networkId, contract, tokenId, action, txHash } = state;

    // Capture transaction hash from callback - use URL parameter if available
    let capturedTxHash = '';
    try {
      if (req.nextUrl.searchParams.has('txHash')) {
        capturedTxHash = req.nextUrl.searchParams.get('txHash') || '';
      }
      
      if (buttonId === '1' && action === 'tx_callback' && capturedTxHash) {
        console.log('Captured transaction hash:', capturedTxHash);
        state.txHash = capturedTxHash;
      }
    } catch (error) {
      console.error('Error capturing txHash:', error instanceof Error ? error.message : String(error));
    }

    // Check if we're in transaction callback mode
    if (action === 'tx_callback' && txHash) {
      const network = MAINNET_NETWORKS.find(n => n.id.toString() === networkId);
      if (!network) {
        return new NextResponse(
          `<!DOCTYPE html>
          <html>
            <head>
              <meta property="fc:frame" content="vNext">
              <meta property="fc:frame:image" content="${req.nextUrl.origin}/logo.png">
              <meta property="fc:frame:title" content="Error">
              <meta property="fc:frame:post_url" content="${req.nextUrl.origin}/api/frames/nft/action">
              <meta property="fc:frame:button:1" content="Back to Marketplace">
            </head>
            <body>
              <p>Error: Invalid network for transaction callback</p>
            </body>
          </html>`,
          { status: 200, headers: { 'Content-Type': 'text/html' } }
        );
      }
      
      // Get transaction status from our service
      const txStatus = await trackReservoirTransaction(network, txHash);
      
      if (txStatus.status === 'completed') {
        // Transaction successful
        return new NextResponse(
          `<!DOCTYPE html>
          <html>
            <head>
              <meta property="fc:frame" content="vNext">
              <meta property="fc:frame:image" content="${req.nextUrl.origin}/success_transaction.png">
              <meta property="fc:frame:title" content="Purchase Successful!">
              <meta property="fc:frame:post_url" content="${req.nextUrl.origin}/api/frames/nft/action">
              <meta property="fc:frame:button:1" content="View NFT">
              <meta property="fc:frame:button:1:action" content="link">
              <meta property="fc:frame:button:1:target" content="${process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin}?tab=marketplace&network=${networkId}&contract=${contract}&tokenId=${tokenId}">
            </head>
            <body>
              <p>Your purchase was completed successfully!</p>
            </body>
          </html>`,
          { status: 200, headers: { 'Content-Type': 'text/html' } }
        );
      } else if (txStatus.status === 'failed') {
        // Transaction failed
        return new NextResponse(
          `<!DOCTYPE html>
          <html>
            <head>
              <meta property="fc:frame" content="vNext">
              <meta property="fc:frame:image" content="${req.nextUrl.origin}/failed_transaction.png">
              <meta property="fc:frame:title" content="Purchase Failed">
              <meta property="fc:frame:post_url" content="${req.nextUrl.origin}/api/frames/nft/action">
              <meta property="fc:frame:button:1" content="Try Again">
              <meta property="fc:frame:state" content="${Buffer.from(JSON.stringify({
                networkId,
                contract,
                tokenId,
                action: 'initial'
              })).toString('base64')}">
            </head>
            <body>
              <p>Transaction failed: ${txStatus.message || 'Unknown error'}</p>
            </body>
          </html>`,
          { status: 200, headers: { 'Content-Type': 'text/html' } }
        );
      } else {
        // Transaction still pending
        return new NextResponse(
          `<!DOCTYPE html>
          <html>
            <head>
              <meta property="fc:frame" content="vNext">
              <meta property="fc:frame:image" content="${req.nextUrl.origin}/pending_transaction.png">
              <meta property="fc:frame:title" content="Processing Purchase">
              <meta property="fc:frame:post_url" content="${req.nextUrl.origin}/api/frames/nft/action">
              <meta property="fc:frame:button:1" content="Check Status">
              <meta property="fc:frame:state" content="${Buffer.from(JSON.stringify({
                networkId,
                contract,
                tokenId,
                action: 'tx_callback',
                txHash
              })).toString('base64')}">
            </head>
            <body>
              <p>Transaction is being processed. Click to check status.</p>
            </body>
          </html>`,
          { status: 200, headers: { 'Content-Type': 'text/html' } }
        );
      }
    }
    
    // If button 2 or 3 is pressed (Go back), return to the initial frame
    if ((buttonId === '2' && action === 'initial') || buttonId === '3') {
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <meta property="fc:frame" content="vNext">
            <meta property="fc:frame:image" content="${process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin}/api/frames/nft?network=${networkId}&contract=${contract}&tokenId=${tokenId}">
            <meta property="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin}/api/frames/nft/action">
            <meta property="fc:frame:button:1" content="Refresh NFT Details">
            <meta property="fc:frame:state" content="${Buffer.from(JSON.stringify({
              networkId,
              contract,
              tokenId,
              action: 'initial'
            })).toString('base64')}">
          </head>
          <body>
            <p>Returning to NFT details...</p>
          </body>
        </html>`,
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'text/html'
          }
        }
      );
    }
    
    // Validate essential parameters
    if (!networkId || !contract || !tokenId) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <meta property="fc:frame" content="vNext">
            <meta property="fc:frame:image" content="${req.nextUrl.origin}/logo.png">
            <meta property="fc:frame:title" content="Error">
            <meta property="fc:frame:post_url" content="${req.nextUrl.origin}/api/frames/nft/action">
            <meta property="fc:frame:button:1" content="Try Again">
          </head>
          <body>
            <p>Error: Missing required state parameters</p>
          </body>
        </html>`,
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'text/html'
          }
        }
      );
    }
    
    const network = MAINNET_NETWORKS.find(n => n.id.toString() === networkId);
    if (!network) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <meta property="fc:frame" content="vNext">
            <meta property="fc:frame:image" content="${req.nextUrl.origin}/logo.png">
            <meta property="fc:frame:title" content="Error">
            <meta property="fc:frame:post_url" content="${req.nextUrl.origin}/api/frames/nft/action">
            <meta property="fc:frame:button:1" content="Try Again">
          </head>
          <body>
            <p>Error: Invalid network</p>
          </body>
        </html>`,
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'text/html'
          }
        }
      );
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
    
    // Fetch current NFT data to display in the confirmation frame
    try {
      const apiUrl = `${network.reservoirBaseUrl}/tokens/v7?tokens=${contract}:${tokenId}`;
      const apiKey = process.env.NEXT_PUBLIC_RESERVOIR_API_KEY || 'demo-api-key';
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-api-key': apiKey
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch NFT data: ${response.status}`);
      }
      
      const data = await response.json();
      const nft = data.tokens?.[0];
      
      if (!nft) {
        throw new Error('NFT not found');
      }
      
      const name = nft.token?.name || `NFT #${tokenId}`;
      const image = nft.token?.image || '/logo.png';
      const price = nft.market?.floorAsk?.price?.amount?.native || 'Not for sale';
      const currency = nft.market?.floorAsk?.price?.currency?.symbol || 'ETH';
      
      const buyUrl = `${baseUrl}?tab=marketplace&network=${networkId}&contract=${contract}&tokenId=${tokenId}&action=buy`;
      
      // If button 1 was pressed, prepare transaction using the new service
      if (buttonId === '1') {
        try {
          // Use the new transaction preparation service
          const purchaseData = await prepareFramePurchaseTransaction(
            network,
            contract,
            tokenId,
            userAddress,
            baseUrl
          );
          
          // If successful, show purchase button with tx
          if (purchaseData.success && purchaseData.txUrl) {
            // Define formatted price and currency
            const priceDisplay = typeof purchaseData.price === 'number' 
              ? purchaseData.price.toFixed(4) 
              : purchaseData.price;
              
            // Absolute image URL (important for frames)
            const imageUrl = purchaseData.nft?.image?.startsWith('http') 
              ? purchaseData.nft.image 
              : `${baseUrl}${purchaseData.nft?.image || '/logo.png'}`;
            
            return new NextResponse(
              `<!DOCTYPE html>
              <html>
                <head>
                  <!-- Required Frame metadata -->
                  <meta property="fc:frame" content="vNext">
                  <meta property="fc:frame:image" content="${imageUrl}">
                  <meta property="fc:frame:post_url" content="${baseUrl.replace('http://', 'https://')}/api/frames/nft/action">
                  
                  <!-- Optional Frame metadata -->
                  <meta property="fc:frame:title" content="Buy ${purchaseData.nft?.name}">
                  
                  <!-- Purchase button with wallet -->
                  <meta property="fc:frame:button:1" content="Sign Purchase (${priceDisplay} ${purchaseData.currency})">
                  <meta property="fc:frame:button:1:action" content="tx">
                  <meta property="fc:frame:button:1:target" content="${purchaseData.txUrl}">
                  <meta property="fc:frame:button:1:callback" content="${req.nextUrl.origin}/api/frames/nft/action">
                  
                  <!-- Helper buttons -->
                  <meta property="fc:frame:button:2" content="Open in Marketplace">
                  <meta property="fc:frame:button:2:action" content="link">
                  <meta property="fc:frame:button:2:target" content="${buyUrl}">
                  <meta property="fc:frame:button:3" content="Go Back">
                  
                  <!-- Frame state for callbacks -->
                  <meta property="fc:frame:state" content="${Buffer.from(JSON.stringify({
                    networkId,
                    contract,
                    tokenId,
                    action: 'tx_callback',
                    image: imageUrl,
                    name: purchaseData.nft?.name
                  })).toString('base64')}">
                  
                  <!-- OpenGraph tags for fallback -->
                  <meta property="og:title" content="Buy ${purchaseData.nft?.name}">
                  <meta property="og:image" content="${imageUrl}">
                  <meta property="og:description" content="Buy this NFT for ${priceDisplay} ${purchaseData.currency}">
                  <title>Buy ${purchaseData.nft?.name}</title>
                </head>
                <body>
                  <h1>Buy ${purchaseData.nft?.name}</h1>
                  <p>Price: ${priceDisplay} ${purchaseData.currency}</p>
                  <p>Click "Sign Purchase" to buy directly with your Warpcast wallet.</p>
                </body>
              </html>`,
              {
                headers: { 'Content-Type': 'text/html' }
              }
            );
          }
        } catch (error) {
          console.error('Error preparing transaction:', error);
          // Fall through to the fallback flow
        }
      }
      
      // Fallback for normal flow if we can't prepare a transaction
      // Ensure the image has an absolute URL
      const fullImageUrl = image.startsWith('http') ? image : `${baseUrl}${image}`;

      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <!-- Required Frame metadata -->
            <meta property="fc:frame" content="vNext">
            <meta property="fc:frame:image" content="${fullImageUrl}">
            <meta property="fc:frame:post_url" content="${baseUrl.replace('http://', 'https://')}/api/frames/nft/action">
            
            <!-- Optional Frame metadata -->
            <meta property="fc:frame:title" content="Buy ${name}">
            
            <!-- Frame buttons -->
            <meta property="fc:frame:button:1" content="Open in Marketplace">
            <meta property="fc:frame:button:1:action" content="link">
            <meta property="fc:frame:button:1:target" content="${buyUrl}">
            <meta property="fc:frame:button:2" content="Go back">
            
            <!-- Frame state -->
            <meta property="fc:frame:state" content="${Buffer.from(JSON.stringify({
              networkId,
              contract,
              tokenId,
              action: 'buy',
              image: fullImageUrl,
              name: name
            })).toString('base64')}">
            
            <!-- OpenGraph tags for fallback -->
            <meta property="og:title" content="Buy ${name}">
            <meta property="og:image" content="${fullImageUrl}">
            <meta property="og:description" content="NFT for sale: ${price} ${currency}">
          </head>
          <body>
            <h1>Ready to Buy ${name}</h1>
            <p>Price: ${price} ${currency}</p>
            <p>To complete your purchase, please open in our marketplace.</p>
          </body>
        </html>`,
        {
          headers: { 'Content-Type': 'text/html' }
        }
      );
    } catch (error) {
      console.error('Error preparing purchase:', error);
      
      // In case of error, return an error frame
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <meta property="fc:frame" content="vNext">
            <meta property="fc:frame:title" content="Error">
            <meta property="fc:frame:image" content="${baseUrl}/logo.png">
            <meta property="fc:frame:post_url" content="${baseUrl.replace('http://', 'https://')}/api/frames/nft/action">
            
            <meta property="fc:frame:button:1" content="Try Again">
            
            <meta property="fc:frame:state" content="${Buffer.from(JSON.stringify({
              action: 'error'
            })).toString('base64')}">
          </head>
          <body>
            <h1>Error</h1>
            <p>Failed to prepare purchase. Please try again.</p>
            <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
          </body>
        </html>`,
        {
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }
    
  } catch (error) {
    console.error('Frame action error:', error instanceof Error ? error.stack : String(error));
    
    // Get reliable origin URL
    const origin = process.env.NEXT_PUBLIC_BASE_URL || 
                   (req.headers.get('host') ? `https://${req.headers.get('host')}` : 'https://your-domain.com');
    
    // Return an error frame according to the documentation recommendations
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <meta property="fc:frame" content="vNext">
          <meta property="fc:frame:title" content="Error">
          <meta property="fc:frame:image" content="${origin}/logo.png">
          <meta property="fc:frame:post_url" content="${origin}/api/frames/nft/action">
          
          <meta property="fc:frame:button:1" content="Try Again">
          
          <meta property="fc:frame:state" content="${Buffer.from(JSON.stringify({
            action: 'error'
          })).toString('base64')}">
        </head>
        <body>
          <h1>Error</h1>
          <p>Something went wrong. Please try again.</p>
          <p>Error details: ${error instanceof Error ? error.message : 'Unknown error'}</p>
        </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }
}
