import { MAINNET_NETWORKS } from '@/lib/services/mainnetReservoir';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // Parse the frame action
    const formData = await req.formData();
    const stateBase64 = formData.get('state') as string;
    const buttonId = formData.get('buttonIndex') as string;
    
    if (!stateBase64) {
      throw new Error('Missing state parameter');
    }
    
    // Decode the state
    const stateJson = Buffer.from(stateBase64, 'base64').toString();
    const state = JSON.parse(stateJson);
    
    const { networkId, contract, tokenId } = state;
    
    // Find the network
    const network = MAINNET_NETWORKS.find(n => n.id.toString() === networkId);
    if (!network) {
      throw new Error('Invalid network');
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
    
    // Different actions based on button clicked
    switch (buttonId) {
      case "1": // Buy NFT
        // Redirect to marketplace with the NFT selected
        return new NextResponse(
          `<!DOCTYPE html>
          <html>
            <head>
              <meta property="fc:frame" content="vNext">
              <meta name="fc:frame:title" content="Buy this NFT">
              <meta property="fc:frame:image" content="/p2b.png">
              <meta property="fc:frame:button:1" content="Open Marketplace">
              <meta property="fc:redirect" content="${baseUrl}?tab=marketplace&network=${networkId}&contract=${contract}&tokenId=${tokenId}&action=buy">
            </head>
            <body>
              <p>Redirecting to marketplace...</p>
            </body>
          </html>`,
          {
            headers: { 'Content-Type': 'text/html' },
          }
        );
        
      case "2": // View Details
        // Show more details about the NFT
        return new NextResponse(
          `<!DOCTYPE html>
          <html>
            <head>
              <meta property="fc:frame" content="vNext">
              <meta name="fc:frame:title" content="NFT Details">
              <meta property="fc:frame:image" content="/p2b.png">
              <meta property="fc:frame:button:1" content="Open Marketplace">
              <meta property="fc:redirect" content="${baseUrl}?tab=marketplace&network=${networkId}&contract=${contract}&tokenId=${tokenId}">
            </head>
            <body>
              <p>View more details about this NFT</p>
            </body>
          </html>`,
          {
            headers: { 'Content-Type': 'text/html' },
          }
        );
        
      case "3": // Share
        try {
          const nftResponse = await fetch(`${baseUrl}/api/frames/nft?network=${networkId}&contract=${contract}&tokenId=${tokenId}`).then(res => res.text());
          
          const titleMatch = nftResponse.match(/<meta property="og:title" content="([^"]*)"/);
          const imageMatch = nftResponse.match(/<meta property="og:image" content="([^"]*)"/);

          const title = titleMatch ? titleMatch[1] : `NFT #${tokenId}`;
          const image = imageMatch ? imageMatch[1] : `https://img.reservoir.tools/images/v2/base/7%2FrdF%2Fe%2F0iXY8HduhRCoIehkmFeXPeOQQFbbmIPfjCYzAZb5c8PsKx%2F2%2F8tnLlug3mSsdBXJBd1jXk3t4Veez5Te75rFKC2jJrjqkWJjcMZwQkQoxzRXJh5RFQ%2B%2BIgJUKr4TxuzFm2m072q3aSqZ4w%3D%3D.gif?width=512`;
          
          const frameUrl = new URL(`${baseUrl}/api/frames/nft`);
          frameUrl.searchParams.append('network', networkId);
          frameUrl.searchParams.append('contract', contract);
          frameUrl.searchParams.append('tokenId', tokenId);
        
          const shareText = `Check out this NFT: ${title}`;
          const warpcastUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(frameUrl.toString())}`;
          
          return new NextResponse(
            `<!DOCTYPE html>
            <html>
              <head>
                <meta property="fc:frame" content="vNext">
                <meta name="fc:frame:title" content="Share this NFT">
                <meta property="fc:frame:image" content="${image}">
                <meta property="fc:frame:button:1" content="Share on Warpcast">
                <meta property="fc:redirect" content="${warpcastUrl}">
              </head>
              <body>
                <p>Redirecting to Warpcast to share this NFT...</p>
              </body>
            </html>`,
            {
              headers: { 'Content-Type': 'text/html' },
            }
          );
        } catch (error) {
          console.error('Error fetching NFT data for sharing:', error);
        }
        
      default:
        throw new Error('Invalid button');
    }
  } catch (error) {
    console.error('Frame action error:', error);
    
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <meta property="fc:frame" content="vNext">
          <meta name="fc:frame:title" content="Error">
          <meta property="fc:frame:image" content="/logo.png">
          <meta name="fc:frame:button:1" content="Try Again">
        </head>
        <body>
          <p>Something went wrong. Please try again.</p>
        </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html' },
        status: 500
      }
    );
  }
}
