import { prepareFramePurchaseTransaction } from '@/lib/services/frameTransactions';
import { MAINNET_NETWORKS } from '@/lib/services/mainnetReservoir';
import { trackReservoirTransaction } from '@/lib/services/reservoirTx';
import { extractWalletFromFrameData, verifySignature } from '@/lib/utils/signatureVerification';
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
    if (!buttonId || !stateBase64 || !trustedData || !untrustedData) {
      try {
        const clonedReq = req.clone();
        const jsonData = await clonedReq.json().catch(() => ({}));
        console.log('JSON data keys:', Object.keys(jsonData));
        console.log('Full JSON data structure:', JSON.stringify(jsonData, null, 2));
        
        // Extract standard frame data
        if (!stateBase64 && jsonData.state) stateBase64 = jsonData.state;
        if (!buttonId && jsonData.buttonIndex) buttonId = jsonData.buttonIndex;
        
        // Extract trusted data
        if (!trustedData && jsonData.trustedData?.messageBytes) {
          trustedData = jsonData.trustedData.messageBytes;
        }
        
        // Extract untrusted data
        if (!untrustedData && jsonData.untrustedData) {
          untrustedData = jsonData.untrustedData;
        }

        // Farcaster Frame specific format handling - use button index from frame action
        if (!buttonId && jsonData.untrustedData?.buttonIndex) {
          buttonId = String(jsonData.untrustedData.buttonIndex);
          console.log('Extracted buttonIndex from untrustedData:', buttonId);
        }
        
        // Extract state from Farcaster Frame format if available
        if (!stateBase64 && jsonData.untrustedData?.state) {
          stateBase64 = jsonData.untrustedData.state;
          console.log('Extracted state from untrustedData:', stateBase64);
        }
        
        console.log('Data extracted from JSON:', { 
          stateBase64: stateBase64 ? stateBase64.substring(0, 20) + '...' : 'none', 
          buttonId, 
          hasTrustedData: !!trustedData, 
          hasUntrustedData: !!untrustedData 
        });
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
    
    // Properly parse untrustedData if it's a string
    let parsedUntrustedData: any = null;
    if (typeof untrustedData === 'string') {
      try {
        parsedUntrustedData = JSON.parse(untrustedData);
        console.log('Successfully parsed untrustedData string to object');
      } catch (err) {
        console.log('untrustedData is not JSON parsable:', err);
        parsedUntrustedData = untrustedData; // Keep as is
      }
    } else if (typeof untrustedData === 'object') {
      parsedUntrustedData = untrustedData;
    }
    
    // Extract user data from frame interaction
    let userAddress = '';
    let userFid = '';  // Add Farcaster ID for fallback identification
    
    // Try to extract FID from untrusted data first (more reliable than wallet address)
    if (parsedUntrustedData && typeof parsedUntrustedData === 'object') {
      if (parsedUntrustedData.fid) {
        userFid = typeof parsedUntrustedData.fid === 'object' 
          ? String(parsedUntrustedData.fid.id || parsedUntrustedData.fid)
          : String(parsedUntrustedData.fid);
        console.log('Found user FID:', userFid);
      }
    }
    
    if (trustedData) {
      try {
        // Verify the trusted data signature
        const verified = await verifySignature(trustedData);
        if (!verified) {
          throw new Error('Invalid signature in trusted data');
        }
        console.log('Trusted data verified successfully');
        
        try {
          // Parse the trusted data as JSON first to see if it's directly usable
          try {
            const parsedTrustedData = JSON.parse(trustedData);
            console.log('Successfully parsed trusted data as JSON');
            
            // Check if we have custody address directly in the parsed data
            if (parsedTrustedData.custody_address && 
                parsedTrustedData.custody_address.startsWith('0x')) {
              userAddress = parsedTrustedData.custody_address;
              console.log('Found wallet address in trusted data:', userAddress);
            }
          } catch (e) {
            console.log('Could not parse trusted data as JSON, trying alternative methods');
          }
          
          // If we still don't have an address, try to decode the message bytes
          if (!userAddress) {
            console.log('Trying to extract wallet from frame data');
            
            // Look for custody address in untrusted data first (more reliable for testing)
            if (parsedUntrustedData) {
              // Check addresses in verified accounts
              if (parsedUntrustedData.verifiedAddresses && 
                  Array.isArray(parsedUntrustedData.verifiedAddresses)) {
                for (const address of parsedUntrustedData.verifiedAddresses) {
                  if (typeof address === 'string' && address.startsWith('0x')) {
                    userAddress = address;
                    console.log('Found wallet address in verifiedAddresses:', userAddress);
                    break;
                  }
                }
              }
              
              // Check for connected wallet data
              if (!userAddress && parsedUntrustedData.wallets && 
                  Array.isArray(parsedUntrustedData.wallets)) {
                for (const wallet of parsedUntrustedData.wallets) {
                  if (wallet && wallet.address && typeof wallet.address === 'string') {
                    userAddress = wallet.address;
                    console.log('Found wallet address in wallets array:', userAddress);
                    break;
                  }
                }
              }
            }
            
            // If still no address, use the utility as fallback
            if (!userAddress) {
              const extractedAddress = await extractWalletFromFrameData(
                typeof trustedData === 'object' && trustedData !== null && 'messageBytes' in trustedData 
                  ? trustedData 
                  : { messageBytes: trustedData }, 
                parsedUntrustedData
              );
              
              if (extractedAddress) {
                userAddress = extractedAddress;
                console.log('Successfully extracted wallet address:', userAddress);
              }
            }
          }
        } catch (err) {
          console.log('Could not extract custody address from trusted data:', err);
        }
      } catch (error) {
        console.error('Error verifying trusted data:', error instanceof Error ? error.message : String(error));
      }
    }

    if (untrustedData) {
      console.log('Raw untrustedData received type:', typeof untrustedData);
      
      // Log a safe preview of the untrustedData
      if (typeof untrustedData === 'string') {
        console.log('String untrustedData preview:', untrustedData.length > 100 ? untrustedData.substring(0, 100) + '...' : untrustedData);
      } else if (typeof untrustedData === 'object') {
        console.log('Object untrustedData keys:', Object.keys(untrustedData as object));
        console.log('Object untrustedData stringified:', JSON.stringify(untrustedData, null, 2));
      }
      
      try {
        // Handle different formats of untrustedData
        let parsedData: any = untrustedData;
        
        // If it's a string, try to parse it as JSON
        if (typeof untrustedData === 'string') {
          try {
            parsedData = JSON.parse(untrustedData);
            console.log('Successfully parsed untrustedData as JSON');
          } catch (e) {
            console.log('Failed to parse untrustedData as JSON, using as is');
          }
        }
        
        // Special handling for Farcaster Frame format
        if (typeof parsedData === 'object' && parsedData !== null) {
          // Farcaster Frame format - connected ETH address can be in different places
          
          // Check for direct connectedAddresses array (Warpcast's format)
          if (Array.isArray(parsedData.connectedAddresses) && parsedData.connectedAddresses.length > 0) {
            for (const addr of parsedData.connectedAddresses) {
              if (addr && typeof addr === 'string' && addr.startsWith('0x')) {
                userAddress = addr;
                console.log('Found user address in connectedAddresses:', userAddress);
                break;
              }
            }
          }
          
          // New Warpcast format - check for wallets object
          if (!userAddress && parsedData.wallets && Array.isArray(parsedData.wallets)) {
            for (const wallet of parsedData.wallets) {
              if (wallet && wallet.address && typeof wallet.address === 'string' && wallet.address.startsWith('0x')) {
                userAddress = wallet.address;
                console.log('Found user address in wallets array:', userAddress);
                break;
              }
            }
          }
          
          // If not found, try the commonly used singular address property 
          if (!userAddress) {
            if (parsedData.connectedAddress && typeof parsedData.connectedAddress === 'string') {
              userAddress = parsedData.connectedAddress;
              console.log('Found user address in connectedAddress:', userAddress);
            }
          }
          
          // Try other common paths in Farcaster Frame untrustedData
          if (!userAddress) {
            // Direct properties that may contain the wallet address
            if (parsedData.address && typeof parsedData.address === 'string' && parsedData.address.startsWith('0x')) {
              userAddress = parsedData.address;
              console.log('Found user address in direct address property:', userAddress);
            } else if (parsedData.walletAddress && typeof parsedData.walletAddress === 'string' && parsedData.walletAddress.startsWith('0x')) {
              userAddress = parsedData.walletAddress;
              console.log('Found user address in walletAddress property:', userAddress);
            } else if (parsedData.ethAddress && typeof parsedData.ethAddress === 'string' && parsedData.ethAddress.startsWith('0x')) {
              userAddress = parsedData.ethAddress;
              console.log('Found user address in ethAddress property:', userAddress);
            }
          }

          // Try Farcaster standard fields
          if (!userAddress) {
            // Try directly in fid object
            if (parsedData.fid && typeof parsedData.fid === 'object') {
              if (parsedData.fid.custody_address && parsedData.fid.custody_address.startsWith('0x')) {
                userAddress = parsedData.fid.custody_address;
                console.log('Found user address in fid.custody_address:', userAddress);
              } else if (parsedData.fid.verified_addresses && Array.isArray(parsedData.fid.verified_addresses)) {
                // Look for ethereum addresses in verified_addresses array
                for (const addr of parsedData.fid.verified_addresses) {
                  if (typeof addr === 'string' && addr.startsWith('0x')) {
                    userAddress = addr;
                    console.log('Found user address in fid.verified_addresses array:', userAddress);
                    break;
                  }
                }
              }
            }
          }
          
          // If still not found, log the issue
          if (!userAddress) {
            console.log('No Ethereum address found in untrustedData');
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
    
    // Extract values from state but use let so we can modify them if needed
    let { networkId, contract, tokenId, action, txHash } = state;

    // Capture transaction hash from callback - use URL parameter if available
    let capturedTxHash = '';
    try {
      // Check URL parameters first
      if (req.nextUrl.searchParams.has('txHash')) {
        capturedTxHash = req.nextUrl.searchParams.get('txHash') || '';
        console.log('Found txHash in URL parameters:', capturedTxHash);
      }
      
      // Check if it's in the untrustedData from newer Farcaster Frames
      if (parsedUntrustedData && typeof parsedUntrustedData === 'object') {
        if (parsedUntrustedData.transactionId && typeof parsedUntrustedData.transactionId === 'string') {
          capturedTxHash = parsedUntrustedData.transactionId;
          console.log('Found txHash in untrustedData.transactionId:', capturedTxHash);
        } else if (parsedUntrustedData.txHash && typeof parsedUntrustedData.txHash === 'string') {
          capturedTxHash = parsedUntrustedData.txHash;
          console.log('Found txHash in untrustedData.txHash:', capturedTxHash);
        } else if (parsedUntrustedData.transaction && typeof parsedUntrustedData.transaction === 'object') {
          if (parsedUntrustedData.transaction.hash) {
            capturedTxHash = parsedUntrustedData.transaction.hash;
            console.log('Found txHash in untrustedData.transaction.hash:', capturedTxHash);
          }
        }
      }
      
      // Store the transaction hash in state for tracking
      if (capturedTxHash) {
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
      // We already checked that network is not undefined above, but TypeScript doesn't know that
      // Add a non-null assertion or proper type guard
      const txStatus = await trackReservoirTransaction(network!, txHash);
      
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
      console.log('Missing essential parameters:', { networkId, contract, tokenId });
      
      // First try to extract from parsedUntrustedData.url if available
      if (typeof parsedUntrustedData === 'object' && parsedUntrustedData && parsedUntrustedData.url) {
        try {
          const frameUrl = new URL(parsedUntrustedData.url);
          const frameParams = frameUrl.searchParams;
          
          const frameNetwork = frameParams.get('network');
          const frameContract = frameParams.get('contract');
          const frameTokenId = frameParams.get('tokenId');
          
          console.log('Found parameters in untrustedData.url:', { 
            frameNetwork, 
            frameContract, 
            frameTokenId 
          });
          
          if (frameNetwork && frameContract && frameTokenId) {
            state.networkId = frameNetwork;
            state.contract = frameContract;
            state.tokenId = frameTokenId;
            state.action = 'initial';
            
            // Update local variables for immediate use
            networkId = frameNetwork;
            contract = frameContract;
            tokenId = frameTokenId;
            
            console.log('Using parameters from untrustedData.url');
          }
        } catch (err) {
          console.error('Error extracting params from untrustedData.url:', err);
        }
      }
      
      // Check URL parameters directly as fallback
      const urlNetwork = req.nextUrl.searchParams.get('network');
      const urlContract = req.nextUrl.searchParams.get('contract');
      const urlTokenId = req.nextUrl.searchParams.get('tokenId');
      
      if (urlNetwork && urlContract && urlTokenId && (!networkId || !contract || !tokenId)) {
        console.log('Found parameters in URL:', { urlNetwork, urlContract, urlTokenId });
        state.networkId = urlNetwork;
        state.contract = urlContract;
        state.tokenId = urlTokenId;
        state.action = 'initial';
        
        // Update local variables for immediate use
        networkId = urlNetwork;
        contract = urlContract;
        tokenId = urlTokenId;
      } else {
        // If still missing essential parameters, return error
        return new NextResponse(
          `<!DOCTYPE html>
          <html>
            <head>
              <meta property="fc:frame" content="vNext">
              <meta property="fc:frame:image" content="${req.nextUrl.origin}/logo.png">
              <meta property="fc:frame:title" content="Error: Missing NFT Info">
              <meta property="fc:frame:post_url" content="${req.nextUrl.origin}/api/frames/nft/action">
              <meta property="fc:frame:button:1" content="View All NFTs">
              <meta property="fc:frame:button:1:action" content="link">
              <meta property="fc:frame:button:1:target" content="${req.nextUrl.origin}?tab=marketplace">
            </head>
            <body>
              <p>Error: Missing required NFT parameters. Could not determine which NFT you're trying to view.</p>
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
          // Make sure we have all required parameters with proper types
          if (!network || !contract || !tokenId) {
            throw new Error('Missing required network, contract or tokenId for purchase');
          }
          
          // Use either wallet address, FID placeholder, or a generic placeholder
          let buyerIdentifier: string;
          
          if (userAddress && userAddress.startsWith('0x')) {
            buyerIdentifier = userAddress;
            console.log('Using actual wallet address for transaction:', buyerIdentifier);
          } else if (userFid) {
            // Use FID as identifier with prefix to indicate it's not a wallet address
            buyerIdentifier = `fid:${userFid}`;
            console.log('Using FID as identifier:', buyerIdentifier);
          } else {
            // Use a generic placeholder that the client should replace
            buyerIdentifier = '${WALLET}';
            console.log('Using generic placeholder for wallet');
          }
          
          // Use the transaction preparation service
          const purchaseData = await prepareFramePurchaseTransaction(
            network,
            contract,
            tokenId,
            buyerIdentifier,
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
                  <meta property="fc:frame:button:1:action" content="transaction">
                  <meta property="fc:frame:button:1:target" content="${purchaseData.txUrl}">
                  <meta property="fc:frame:button:1:post_url" content="${req.nextUrl.origin}/api/frames/nft/action">
                  
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
