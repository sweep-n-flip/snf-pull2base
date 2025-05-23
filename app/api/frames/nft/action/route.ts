import { prepareFramePurchaseTransaction } from '@/lib/services/frameTransactions';
import { MAINNET_NETWORKS } from '@/lib/services/mainnetReservoir';
import { trackReservoirTransaction } from '@/lib/services/reservoirTx';
import { verifySignature } from '@/lib/utils/signatureVerification';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // Log complete request information for debugging
    console.log('Frame action request received:');
    console.log('- Method:', req.method);
    console.log('- URL:', req.url);
    
    // Log headers safely
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log('- Headers:', JSON.stringify(headers, null, 2));
    
    let stateBase64: string = '';
    let buttonId: string = '';
    let trustedData: string = '';
    let untrustedData: string = '';
    
    // Check if it's a form submission
    const contentType = req.headers.get('content-type') || '';
    console.log('Content-Type:', contentType);
    
    // Try all possible ways to extract data
    // 1. First try URL parameters (query string)
    const url = new URL(req.url);
    
    // Log URL parameters safely
    const urlParams: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      urlParams[key] = value;
    });
    console.log('URL Parameters:', JSON.stringify(urlParams, null, 2));
    
    // Some quick parameters from URL
    const urlButtonId = url.searchParams.get('buttonIndex');
    const urlState = url.searchParams.get('state');
    if (urlButtonId) buttonId = urlButtonId;
    if (urlState) stateBase64 = urlState;
    
    // 2. Try form data
    if (contentType.includes('form')) {
      try {
        const formData = await req.formData();
        
        // Log form data keys safely
        const formKeys: string[] = [];
        formData.forEach((_, key) => {
          formKeys.push(key);
        });
        console.log('Form data keys:', formKeys);
        
        // Extract data from form
        const stateFromForm = formData.get('state');
        const buttonFromForm = formData.get('buttonIndex');
        const trustedDataFromForm = formData.get('trustedData.messageBytes');
        const untrustedDataFromForm = formData.get('untrustedData');
        
        if (stateFromForm) stateBase64 = stateFromForm as string || stateBase64;
        if (buttonFromForm) buttonId = buttonFromForm as string || buttonId;
        if (trustedDataFromForm) trustedData = trustedDataFromForm as string || '';
        if (untrustedDataFromForm) untrustedData = untrustedDataFromForm as string || '';
        
        console.log('Data extracted from form:', { 
          stateBase64: stateBase64 ? stateBase64.substring(0, 20) + '...' : 'none', 
          buttonId, 
          hasTrustedData: !!trustedData, 
          hasUntrustedData: !!untrustedData 
        });
      } catch (error) {
        console.error('Error processing form data:', error instanceof Error ? error.message : String(error));
      }
    }
    
    // 3. Finally try JSON
    if (!buttonId || !stateBase64) {
      try {
        const clonedReq = req.clone();
        const jsonData = await clonedReq.json().catch(() => ({}));
        console.log('JSON data keys:', Object.keys(jsonData));
        
        if (!stateBase64 && jsonData.state) stateBase64 = jsonData.state;
        if (!buttonId && jsonData.buttonIndex) buttonId = jsonData.buttonIndex;
        if (!trustedData && jsonData.trustedData?.messageBytes) trustedData = jsonData.trustedData.messageBytes;
        if (!untrustedData && jsonData.untrustedData) untrustedData = jsonData.untrustedData;
        
        console.log('Data extracted from JSON:', { stateBase64: stateBase64.substring(0, 20), buttonId, hasTrustedData: !!trustedData, hasUntrustedData: !!untrustedData });
      } catch (error) {
        console.error('Error processing JSON data:', error instanceof Error ? error.message : String(error));
      }
    }
    
    // Log final data availability
    console.log('Final data availability:', { 
      hasState: !!stateBase64, 
      hasButtonId: !!buttonId,
      hasTrustedData: !!trustedData,
      hasUntrustedData: !!untrustedData
    });
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
      console.log('Raw untrustedData received:', 
                  typeof untrustedData === 'string' 
                    ? untrustedData.length > 100 
                      ? untrustedData.substring(0, 100) + '...' 
                      : untrustedData 
                    : typeof untrustedData);
      
      try {
        // Handle different formats of untrustedData
        let parsedData: any = untrustedData;
        
        // If it's a string, try to parse it as JSON
        if (typeof untrustedData === 'string') {
          try {
            // Handle potential stringified JSON
            parsedData = JSON.parse(untrustedData);
            console.log('Successfully parsed untrustedData as JSON');
          } catch (e) {
            console.log('Failed to parse untrustedData as JSON, using as is');
            // If parsing fails, keep the original string
          }
        }
        
        // Try different known paths to find an address
        if (typeof parsedData === 'object' && parsedData !== null) {
          // Common structure paths for address in Farcaster frames
          const possiblePaths = [
            // Direct address property
            parsedData.address,
            // Nested in untrustedData object
            parsedData.untrustedData?.address,
            // Nested in another object
            parsedData.data?.address,
            // From FID data structure
            parsedData.fid?.address || parsedData.fidData?.address,
            // From connected addresses array
            (Array.isArray(parsedData.addresses) ? parsedData.addresses[0] : undefined),
            // From wallets array
            (Array.isArray(parsedData.wallets) ? parsedData.wallets[0]?.address : undefined)
          ];
          
          // Find first non-null, non-undefined value
          userAddress = possiblePaths.find(path => path !== undefined && path !== null) || '';
          
          if (userAddress) {
            console.log('Found user address:', userAddress);
          } else {
            console.log('No address found in parsed data structure');
          }
        }
      } catch (error) {
        console.error('Error processing untrusted data:', error instanceof Error ? error.message : String(error));
      }
    } else {
      console.log('No untrustedData received');
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
        // Log the state format for debugging
        console.log('Raw state format:', typeof stateBase64, stateBase64.substring(0, 50));
        
        // Try to parse the base64 state
        try {
          const stateJson = Buffer.from(stateBase64, 'base64').toString();
          state = JSON.parse(stateJson);
          console.log('State successfully parsed from base64');
        } catch (decodeError) {
          console.log('Failed to decode base64 state, trying direct JSON parse');
          // It might already be JSON
          try {
            state = JSON.parse(stateBase64);
            console.log('State successfully parsed directly as JSON');
          } catch (jsonError) {
            console.error('Error parsing state as direct JSON:', jsonError instanceof Error ? jsonError.message : String(jsonError));
            // Last resort: if it looks like an object string, try eval (in controlled environment only)
            if (stateBase64.startsWith('{') && stateBase64.endsWith('}')) {
              try {
                state = JSON.parse(stateBase64.replace(/'/g, '"'));
                console.log('State parsed after quote replacement');
              } catch (e) {
                console.error('All parsing methods failed');
              }
            }
          }
        }
      } catch (error) {
        console.error('Error in state parsing process:', error instanceof Error ? error.message : String(error));
      }
    } else {
      console.log('No state provided in request');
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
