import { MAINNET_NETWORKS, getMainnetNFTBuyData } from '@/lib/services/mainnetReservoir';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Get URL parameters
  const searchParams = req.nextUrl.searchParams;
  const networkId = searchParams.get('network') || '1';
  const contract = searchParams.get('contract') || '';
  const tokenId = searchParams.get('tokenId') || '';

  // Find the network
  const network = MAINNET_NETWORKS.find(n => n.id.toString() === networkId);
  
  if (!network || !contract || !tokenId) {
    return new NextResponse(
      `<html>
        <head>
          <title>Invalid NFT Frame</title>
          <meta property="og:title" content="Invalid NFT Frame">
          <meta property="og:image" content="/logo.png">
          <meta name="fc:frame" content="vNext">
          <meta name="fc:frame:image" content="/logo.png">
          <meta name="fc:frame:button:1" content="View Details">
        </head>
        <body>
          <p>Invalid NFT parameters</p>
        </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html' },
        status: 400
      }
    );
  }
  
  // Fetch the NFT data directly from the API
  try {
    // Construct Reservoir API URL for the token
    const reservoirApiUrl = `${network.reservoirBaseUrl}/tokens/v7?tokens=${contract}:${tokenId}&includeAttributes=true&includeTopBid=true`;
    
    // API key for the network
    const apiKey = process.env.NEXT_PUBLIC_RESERVOIR_API_KEY || 'demo-api-key';
    
    // Fetch NFT data from Reservoir API
    const response = await fetch(reservoirApiUrl, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'x-api-key': apiKey,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching NFT data: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.tokens || data.tokens.length === 0) {
      throw new Error('NFT not found');
    }
    
    const nft = data.tokens[0];
    
    // Extract necessary data
    const name = nft.token?.name || `#${tokenId}`;
    const collection = nft.token?.collection?.name || '';
    const image = nft.token?.image || '/logo.png';
    const priceData = nft.market?.floorAsk?.price?.amount?.native || '';
    const currencyData = nft.market?.floorAsk?.price?.currency?.symbol || 'ETH';
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
    const buyUrl = `${baseUrl}?tab=marketplace&network=${networkId}&contract=${contract}&tokenId=${tokenId}`;
    
    // Generate appropriate title
    const title = collection ? `${name} from ${collection}` : name || `NFT #${tokenId}`;
    const priceDisplay = priceData ? `${priceData} ${currencyData}` : 'Not for sale';
    
    // HTML response with proper frame meta tags
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>${title} - NFT Frame</title>
          <meta property="og:title" content="${title}">
          <meta property="og:image" content="${image}">
          <meta property="og:description" content="${priceDisplay}">
          
          <!-- Frame metadata -->
          <meta name="fc:frame" content="vNext">
          <meta name="fc:frame:image" content="${image}">
          <meta name="fc:frame:post_url" content="${baseUrl}/api/frames/nft/action">
          
          <meta name="fc:frame:title" content="${title}">
          <meta name="fc:frame:button:1" content="Buy NFT (${priceDisplay})">
          <meta name="fc:frame:button:2" content="View Details">
          <meta name="fc:frame:button:3" content="Share">
          
          <meta property="fc:frame:state" content="${Buffer.from(JSON.stringify({
            networkId,
            contract,
            tokenId,
            action: 'initial',
            image: image,
            title: title
          })).toString('base64')}">
        </head>
        <body>
          <h1>${title}</h1>
          <p>Price: ${priceDisplay}</p>
          <p>Click the button below to buy or learn more about this NFT.</p>
          <p>Network: ${network.name}</p>
          <a href="${buyUrl}">Open in marketplace</a>
        </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  } catch (error) {
    console.error('Error fetching NFT data:', error);
    
    // Return error frame
    return new NextResponse(
      `<html>
        <head>
          <title>Error Loading NFT</title>
          <meta property="og:title" content="Error Loading NFT">
          <meta property="og:image" content="/logo.png">
          <meta name="fc:frame" content="vNext">
          <meta name="fc:frame:image" content="/logo.png">
          <meta name="fc:frame:button:1" content="Try Again">
        </head>
        <body>
          <p>Failed to load NFT data. Please try again.</p>
        </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html' },
        status: 500
      }
    );
  }
}
