import { MAINNET_NETWORKS } from '@/lib/services/mainnetReservoir';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Get URL parameters
  const searchParams = req.nextUrl.searchParams;
  const networkId = searchParams.get('network') || '1';
  const contract = searchParams.get('contract') || '';
  const referrerAddress = searchParams.get('referrer') || '';
  const royaltyBps = searchParams.get('royalty') || '250'; // Default 2.5%

  // Find the network
  const network = MAINNET_NETWORKS.find(n => n.id.toString() === networkId);
  
  if (!network || !contract) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Invalid Collection Frame</title>
          <meta property="og:title" content="Invalid Collection Frame">
          <meta property="og:image" content="${req.nextUrl.origin}/logo.png">
          <meta property="og:description" content="Please provide valid collection parameters">
          
          <meta property="fc:frame" content="vNext">
          <meta property="fc:frame:title" content="Invalid Collection Frame">
          <meta property="fc:frame:image" content="${req.nextUrl.origin}/logo.png">
          <meta property="fc:frame:post_url" content="${req.nextUrl.origin}/api/frames/collection/action">
          
          <meta property="fc:frame:button:1" content="Return to Marketplace">
          <meta property="fc:frame:button:1:action" content="link">
          <meta property="fc:frame:button:1:target" content="${req.nextUrl.origin}?tab=marketplace">
        </head>
        <body>
          <h1>Invalid Collection Parameters</h1>
          <p>The collection parameters provided are invalid or incomplete.</p>
        </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html' },
        status: 200
      }
    );
  }
  
  try {
    // Get collection info and cheapest available NFT
    const apiKey = process.env.NEXT_PUBLIC_RESERVOIR_API_KEY || 'demo-api-key';
    
    // Fetch collection data
    const collectionUrl = `${network.reservoirBaseUrl}/collections/v7?id=${contract}`;
    const collectionResponse = await fetch(collectionUrl, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'x-api-key': apiKey,
      },
    });
    
    if (!collectionResponse.ok) {
      throw new Error(`Error fetching collection data: ${collectionResponse.statusText}`);
    }
    
    const collectionData = await collectionResponse.json();
    
    if (!collectionData.collections || collectionData.collections.length === 0) {
      throw new Error('Collection not found');
    }
    
    const collection = collectionData.collections[0];
    
    // Fetch cheapest available NFT from this collection
    const tokensUrl = `${network.reservoirBaseUrl}/tokens/v7?collection=${contract}&sortBy=floorAskPrice&limit=1&includeTopBid=true`;
    const tokensResponse = await fetch(tokensUrl, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'x-api-key': apiKey,
      },
    });
    
    if (!tokensResponse.ok) {
      throw new Error(`Error fetching tokens data: ${tokensResponse.statusText}`);
    }
    
    const tokensData = await tokensResponse.json();
    let cheapestToken = null;
    let priceDisplay = 'Not for sale';
    let tokenId = '';
    
    if (tokensData.tokens && tokensData.tokens.length > 0) {
      cheapestToken = tokensData.tokens[0];
      tokenId = cheapestToken.token?.tokenId || '';
      const priceData = cheapestToken.market?.floorAsk?.price?.amount?.native || '';
      const currencyData = cheapestToken.market?.floorAsk?.price?.currency?.symbol || 'ETH';
      priceDisplay = priceData ? `${priceData} ${currencyData}` : 'Not for sale';
    }
    
    // Extract collection data
    const collectionName = collection.name || 'Unknown Collection';
    const collectionImage = collection.image || '/logo.png';
    const floorPrice = collection.floorAsk?.price?.amount?.native || '';
    const floorCurrency = collection.floorAsk?.price?.currency?.symbol || 'ETH';
    const floorDisplay = floorPrice ? `${floorPrice} ${floorCurrency}` : 'No floor price';
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
    
    // Build URL for cheapest NFT with referrer and royalty info
    const buyUrl = tokenId 
      ? `${baseUrl}?tab=marketplace&network=${networkId}&contract=${contract}&tokenId=${tokenId}&autoSelect=true&referrer=${referrerAddress}&royalty=${royaltyBps}`
      : `${baseUrl}?tab=marketplace&network=${networkId}&contract=${contract}&autoSelect=true`;
    
    // Ensure image URL is absolute
    const fullImageUrl = collectionImage.startsWith('http') ? collectionImage : `${baseUrl}${collectionImage}`;
    
    // Calculate royalty percentage for display
    const royaltyPercent = (parseInt(royaltyBps) / 100).toFixed(1);
    
    // HTML response with proper frame meta tags
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>${collectionName} - Collection Frame</title>
          <meta property="og:title" content="${collectionName}">
          <meta property="og:image" content="${fullImageUrl}">
          <meta property="og:description" content="Floor: ${floorDisplay} | Cheapest: ${priceDisplay}">
          
          <!-- Frame metadata -->
          <meta property="fc:frame" content="vNext">
          <meta property="fc:frame:image" content="${fullImageUrl}">
          <meta property="fc:frame:post_url" content="${baseUrl.replace('http://', 'https://')}/api/frames/collection/action">
          
          <meta property="fc:frame:title" content="${collectionName}">
          <meta property="fc:frame:button:1" content="Buy Cheapest (${priceDisplay})">
          <meta property="fc:frame:button:1:action" content="link">
          <meta property="fc:frame:button:1:target" content="${buyUrl}">
          
          <meta property="fc:frame:button:2" content="Browse Collection">
          <meta property="fc:frame:button:2:action" content="link">
          <meta property="fc:frame:button:2:target" content="${baseUrl}?tab=marketplace&network=${networkId}&contract=${contract}&autoSelect=true">
          
          ${referrerAddress ? `<meta property="fc:frame:button:3" content="Share & Earn ${royaltyPercent}%">
          <meta property="fc:frame:button:3:action" content="post">` : ''}
          
          <meta property="fc:frame:state" content="${Buffer.from(JSON.stringify({
            networkId,
            contract,
            tokenId,
            referrer: referrerAddress,
            royalty: royaltyBps,
            action: 'collection_view',
            image: fullImageUrl,
            collectionName: collectionName,
            floorPrice: floorDisplay,
            cheapestPrice: priceDisplay
          })).toString('base64')}">
        </head>
        <body>
          <h1>${collectionName}</h1>
          <p>Floor Price: ${floorDisplay}</p>
          <p>Cheapest Available: ${priceDisplay}</p>
          ${referrerAddress ? `<p>Referrer earns ${royaltyPercent}% on sales</p>` : ''}
          <p>Network: ${network.name}</p>
          <a href="${buyUrl}">Open in marketplace</a>
        </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  } catch (error) {
    console.error('Error fetching collection data:', error);
    
    // Return error frame
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Error Loading Collection</title>
          <meta property="og:title" content="Error Loading Collection">
          <meta property="og:image" content="${req.nextUrl.origin}/logo.png">
          <meta property="og:description" content="Failed to load collection data. Please try again.">
          
          <meta property="fc:frame" content="vNext">
          <meta property="fc:frame:image" content="${req.nextUrl.origin}/logo.png">
          <meta property="fc:frame:title" content="Error Loading Collection">
          <meta property="fc:frame:post_url" content="${req.nextUrl.origin}/api/frames/collection/action">
          <meta property="fc:frame:button:1" content="Try Again">
        </head>
        <body>
          <p>Failed to load collection data. Please try again.</p>
        </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html' },
        status: 200
      }
    );
  }
}
