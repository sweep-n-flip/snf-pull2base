export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL;

  return Response.json({
    accountAssociation: {
      header: process.env.FARCASTER_HEADER,
      payload: process.env.FARCASTER_PAYLOAD,
      signature: process.env.FARCASTER_SIGNATURE,
    },
    frame: {
      version: process.env.NEXT_PUBLIC_VERSION,
      name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
      homeUrl: URL,
      iconUrl: `${URL}${process.env.NEXT_PUBLIC_ICON_URL}`,
      imageUrl: `${URL}${process.env.NEXT_PUBLIC_IMAGE_URL}`,
      buttonTitle: `Launch ${process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME}`,
      splashImageUrl: `${URL}${process.env.NEXT_PUBLIC_SPLASH_IMAGE_URL}`,
      splashBackgroundColor: `#${process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR}`,
      webhookUrl: `${URL}/api/webhook`,
      subtitle: "Browse NFT collections on Base", // Adicione uma descrição curta
      description: "Explore NFT collections on Monad Testnet and Sepolia networks with Pull2Base", // Adicione uma descrição mais longa
      primaryCategory: "art-creativity", // Categoria principal
      tags: ["nft", "base", "monad", "sepolia"] // Tags para busca/filtragem
    },
  });
}
