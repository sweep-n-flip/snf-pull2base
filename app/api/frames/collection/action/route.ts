import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Collection frame action received:', body);

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

    // Get user's FID from the frame
    const userFid = body.untrustedData?.fid;
    const buttonIndex = body.untrustedData?.buttonIndex;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;

    // Handle different button actions
    if (buttonIndex === 3) {
      // Share & Earn button - show custom royalty setting frame
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <title>Set Your Referral Rate</title>
            <meta property="fc:frame" content="vNext">
            <meta property="fc:frame:image" content="${baseUrl}/api/frames/collection/royalty-image?collection=${encodeURIComponent(frameData.collectionName || 'Collection')}&current=${frameData.royalty || '250'}">
            <meta property="fc:frame:post_url" content="${baseUrl}/api/frames/collection/set-royalty">
            
            <meta property="fc:frame:input:text" content="Enter royalty % (0.1-10.0)">
            
            <meta property="fc:frame:button:1" content="Set 1%">
            <meta property="fc:frame:button:1:action" content="post">
            
            <meta property="fc:frame:button:2" content="Set 2.5%">
            <meta property="fc:frame:button:2:action" content="post">
            
            <meta property="fc:frame:button:3" content="Set 5%">
            <meta property="fc:frame:button:3:action" content="post">
            
            <meta property="fc:frame:button:4" content="Use Custom">
            <meta property="fc:frame:button:4:action" content="post">
            
            <meta property="fc:frame:state" content="${Buffer.from(JSON.stringify({
              ...frameData,
              userFid,
              action: 'set_royalty'
            })).toString('base64')}">
          </head>
          <body>
            <h1>Set Your Referral Rate</h1>
            <p>Choose how much you'll earn when someone buys through your shared link</p>
          </body>
        </html>`,
        {
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    // Default action - redirect to collection view
    const { networkId, contract, tokenId } = frameData;
    const redirectUrl = tokenId 
      ? `${baseUrl}?tab=marketplace&network=${networkId}&contract=${contract}&tokenId=${tokenId}&autoSelect=true`
      : `${baseUrl}?tab=marketplace&network=${networkId}&contract=${contract}&autoSelect=true`;

    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Redirecting to Collection</title>
          <meta property="fc:frame" content="vNext">
          <meta property="fc:frame:image" content="${frameData.image || `${baseUrl}/logo.png`}">
          <meta property="fc:frame:post_url" content="${baseUrl}/api/frames/collection/action">
          
          <meta property="fc:frame:button:1" content="Open Collection">
          <meta property="fc:frame:button:1:action" content="link">
          <meta property="fc:frame:button:1:target" content="${redirectUrl}">
        </head>
        <body>
          <h1>Opening Collection</h1>
          <p>Click the button to view this collection in the marketplace</p>
        </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );

  } catch (error) {
    console.error('Error in collection frame action:', error);
    
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Error</title>
          <meta property="fc:frame" content="vNext">
          <meta property="fc:frame:image" content="${req.nextUrl.origin}/logo.png">
          <meta property="fc:frame:post_url" content="${req.nextUrl.origin}/api/frames/collection/action">
          <meta property="fc:frame:button:1" content="Try Again">
        </head>
        <body>
          <p>An error occurred. Please try again.</p>
        </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html' },
        status: 200
      }
    );
  }
}
