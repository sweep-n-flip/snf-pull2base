import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Set royalty action received:', body);

    // Get frame state
    const state = body.untrustedData?.state;
    let frameData: any = {};
    
    if (state) {
      try {
        frameData = JSON.parse(Buffer.from(state, 'base64').toString());
      } catch (error) {
        console.error('Error parsing frame state:', error);
      }
    }

    const buttonIndex = body.untrustedData?.buttonIndex;
    const inputText = body.untrustedData?.inputText;
    const userFid = frameData.userFid || body.untrustedData?.fid;

    let royaltyBps = 250; // Default 2.5%

    // Handle different royalty options
    switch (buttonIndex) {
      case 1:
        royaltyBps = 100; // 1%
        break;
      case 2:
        royaltyBps = 250; // 2.5%
        break;
      case 3:
        royaltyBps = 500; // 5%
        break;
      case 4:
        // Use custom input
        if (inputText) {
          const customPercent = parseFloat(inputText);
          if (customPercent >= 0.1 && customPercent <= 10.0) {
            royaltyBps = Math.round(customPercent * 100);
          }
        }
        break;
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
    
    // Generate shareable collection URL with referrer info
    const shareUrl = `${baseUrl}/api/frames/collection?network=${frameData.networkId}&contract=${frameData.contract}&referrer=${userFid}&royalty=${royaltyBps}`;
    
    // Create share text for social media
    const royaltyPercent = (royaltyBps / 100).toFixed(1);
    const shareText = `Check out ${frameData.collectionName || 'this NFT collection'}! 🎨\n\nFloor: ${frameData.floorPrice}\nCheapest: ${frameData.cheapestPrice}\n\nI earn ${royaltyPercent}% if you buy through my link! 💰`;

    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Share Your Collection Link</title>
          <meta property="fc:frame" content="vNext">
          <meta property="fc:frame:image" content="${baseUrl}/api/frames/collection/share-image?collection=${encodeURIComponent(frameData.collectionName || 'Collection')}&royalty=${royaltyPercent}&floor=${encodeURIComponent(frameData.floorPrice || 'N/A')}&cheapest=${encodeURIComponent(frameData.cheapestPrice || 'N/A')}">
          <meta property="fc:frame:post_url" content="${baseUrl}/api/frames/collection/action">
          
          <meta property="fc:frame:button:1" content="Copy Share Link">
          <meta property="fc:frame:button:1:action" content="link">
          <meta property="fc:frame:button:1:target" content="${shareUrl}">
          
          <meta property="fc:frame:button:2" content="Share on Warpcast">
          <meta property="fc:frame:button:2:action" content="link">
          <meta property="fc:frame:button:2:target" content="https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(shareUrl)}">
          
          <meta property="fc:frame:button:3" content="View Collection">
          <meta property="fc:frame:button:3:action" content="link">
          <meta property="fc:frame:button:3:target" content="${baseUrl}?tab=marketplace&network=${frameData.networkId}&contract=${frameData.contract}&autoSelect=true">
          
          <meta property="fc:frame:button:4" content="Back">
          <meta property="fc:frame:button:4:action" content="post">
          
          <meta property="fc:frame:state" content="${Buffer.from(JSON.stringify({
            ...frameData,
            royalty: royaltyBps,
            shareUrl,
            action: 'share_ready'
          })).toString('base64')}">
        </head>
        <body>
          <h1>Your Referral Link is Ready!</h1>
          <p>You'll earn ${royaltyPercent}% on any purchases made through your link</p>
          <p>Share URL: ${shareUrl}</p>
        </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );

  } catch (error) {
    console.error('Error setting royalty:', error);
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
    
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Error Setting Royalty</title>
          <meta property="fc:frame" content="vNext">
          <meta property="fc:frame:image" content="${baseUrl}/logo.png">
          <meta property="fc:frame:post_url" content="${baseUrl}/api/frames/collection/action">
          <meta property="fc:frame:button:1" content="Try Again">
        </head>
        <body>
          <p>Error setting royalty. Please try again.</p>
        </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html' },
        status: 200
      }
    );
  }
}
