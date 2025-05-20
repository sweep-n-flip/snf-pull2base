import { MAINNET_NETWORKS, getMainnetNFTBuyData } from '@/lib/services/mainnetReservoir';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Get URL parameters
  const searchParams = req.nextUrl.searchParams;
  const networkId = searchParams.get('network') || '1';
  const contract = searchParams.get('contract') || '';
  const tokenId = searchParams.get('tokenId') || '';
  const collection = searchParams.get('collection') || '';
  const name = searchParams.get('name') || '';
  const image = searchParams.get('image') || '';
  const price = searchParams.get('price') || '';
  const currency = searchParams.get('currency') || 'ETH';
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
  
  // Try to get fresh price data if none was provided
  let priceData = price;
  let currencyData = currency;
  
  if (!price) {
    try {
      const buyData = await getMainnetNFTBuyData(network, contract, tokenId);
      if (buyData) {
        priceData = buyData.price;
        currencyData = buyData.currency;
      }
    } catch (error) {
      console.error('Error fetching price data:', error);
    }
  }
  
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
        <meta property="og:image" content="${baseUrl}/logo.png">
        <meta property="og:description" content="${priceDisplay}">
        
        <!-- Frame metadata -->
        <meta name="fc:frame" content="vNext">
        <meta name="fc:frame:image" content="${baseUrl}/logo.png"">
        <meta name="fc:frame:post_url" content="${baseUrl}/api/frames/nft/action">
        
        <meta name="fc:frame:title" content="${title}">
        <meta name="fc:frame:button:1" content="Buy NFT (${priceDisplay})">
        <meta name="fc:frame:button:2" content="View Details">
        <meta name="fc:frame:button:3" content="Share">
        
        <meta property="fc:frame:state" content="${Buffer.from(JSON.stringify({
          networkId,
          contract,
          tokenId,
          action: 'initial'
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
}
