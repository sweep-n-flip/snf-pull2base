import { NextResponse } from 'next/server';

export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL || '';

  return NextResponse.json({
    accountAssociation: {
      header: process.env.FARCASTER_HEADER,
      payload: process.env.FARCASTER_PAYLOAD,
      signature: process.env.FARCASTER_SIGNATURE,
    },
    frame: {
      version: process.env.NEXT_PUBLIC_VERSION,
      name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
      homeUrl: URL,
      iconUrl: `${URL}${process.env.NEXT_PUBLIC_ICON_URL || '/p2b.png'}`,
      imageUrl: `${URL}${process.env.NEXT_PUBLIC_IMAGE_URL || '/p2b.png'}`,
      buttonTitle: `Launch ${process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || 'Pull2Base'}`,
      splashImageUrl: `${URL}${process.env.NEXT_PUBLIC_SPLASH_IMAGE_URL || '/p2b.png'}`,
      splashBackgroundColor: `#${process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR || 'ffffff'}`,
      webhookUrl: `${URL}/api/webhook`,
      subtitle: "Browse NFT collections on Base", 
      description: "Explore NFT collections on Monad Testnet and Sepolia networks with Pull2Base",
      primaryCategory: "art-creativity",
      tags: ["nft", "base", "monad", "sepolia"]
    },
    frames: {
      version: 'vNext',
      image: {
        src: `https://img.reservoir.tools/images/v2/base/7%2FrdF%2Fe%2F0iXY8HduhRCoIehkmFeXPeOQQFbbmIPfjCYzAZb5c8PsKx%2F2%2F8tnLlug3mSsdBXJBd1jXk3t4Veez5Te75rFKC2jJrjqkWJjcMZwQkQoxzRXJh5RFQ%2B%2BIgJUKr4TxuzFm2m072q3aSqZ4w%3D%3D.gif?width=512`,
        aspectRatio: '1.91:1'
      },
      buttons: [
        {
          label: 'View Marketplace'
        }
      ],
      postUrl: `${URL}/api/frames/nft`
    }
  });
}