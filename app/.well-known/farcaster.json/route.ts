import { NextResponse } from 'next/server';

export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL || '';

  // Retorna AMBOS os formatos para garantir compatibilidade
  return NextResponse.json({
    // Formato antigo mantido para compatibilidade
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
        src: `${URL}/p2b.png`,
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