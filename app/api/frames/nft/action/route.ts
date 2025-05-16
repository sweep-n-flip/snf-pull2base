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
        // Allow sharing with others
        return new NextResponse(
          `<!DOCTYPE html>
          <html>
            <head>
              <meta property="fc:frame" content="vNext">
              <meta name="fc:frame:title" content="Share this NFT">
              <meta property="fc:frame:image" content="/p2b.png">
              <meta name="fc:frame:button:1" content="Thanks for sharing!">
            </head>
            <body>
              <p>Thank you for sharing this NFT!</p>
            </body>
          </html>`,
          {
            headers: { 'Content-Type': 'text/html' },
          }
        );
        
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
