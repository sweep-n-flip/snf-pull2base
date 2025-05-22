import { MAINNET_NETWORKS } from '@/lib/services/mainnetReservoir';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    const stateBase64 = formData.get('state') as string;
    const buttonId = formData.get('buttonIndex') as string;
    
    if (!buttonId) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <meta property="fc:frame" content="vNext">
            <meta property="fc:frame:image" content="/logo.png">
            <meta property="fc:frame:title" content="Error">
            <meta property="fc:frame:post_url" content="${req.nextUrl.origin}/api/frames/nft/action">
            <meta property="fc:frame:button:1" content="Try Again">
          </head>
          <body>
            <p>Error: Invalid button index</p>
          </body>
        </html>`,
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'text/html'
          }
        }
      );
    }
    
    let state = {};
    if (stateBase64) {
      try {
        const stateJson = Buffer.from(stateBase64, 'base64').toString();
        state = JSON.parse(stateJson);
      } catch (error) {
        console.error('Error parsing state:', error);
      }
    }
    
    const { networkId, contract, tokenId } = state as any;
    
    // If button 2 is pressed (Go back), return to the initial frame
    if (buttonId === '2') {
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <meta property="fc:frame" content="vNext">
            <meta property="fc:frame:image" content="${process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin}/api/frames/nft?network=${networkId}&contract=${contract}&tokenId=${tokenId}">
            <meta property="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin}/api/frames/nft/action">
            <meta property="fc:frame:button:1" content="Refresh NFT Details">
            <meta property="fc:frame:state" content="${stateBase64}">
          </head>
          <body>
            <p>Returning to NFT details...</p>
          </body>
        </html>`,
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'text/html'
          }
        }
      );
    }
    
    if (!networkId || !contract || !tokenId) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <meta property="fc:frame" content="vNext">
            <meta property="fc:frame:image" content="/logo.png">
            <meta property="fc:frame:title" content="Error">
            <meta property="fc:frame:post_url" content="${req.nextUrl.origin}/api/frames/nft/action">
            <meta property="fc:frame:button:1" content="Try Again">
          </head>
          <body>
            <p>Error: Missing required state parameters</p>
          </body>
        </html>`,
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'text/html'
          }
        }
      );
    }
    
    const network = MAINNET_NETWORKS.find(n => n.id.toString() === networkId);
    if (!network) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <meta property="fc:frame" content="vNext">
            <meta property="fc:frame:image" content="/logo.png">
            <meta property="fc:frame:title" content="Error">
            <meta property="fc:frame:post_url" content="${req.nextUrl.origin}/api/frames/nft/action">
            <meta property="fc:frame:button:1" content="Try Again">
          </head>
          <body>
            <p>Error: Invalid network</p>
          </body>
        </html>`,
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'text/html'
          }
        }
      );
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
    
    // Em vez de redirecionar, vamos retornar uma resposta de frame com informações sobre como comprar
    
    // Buscar dados atuais da NFT para exibir no frame de confirmação
    try {
      const apiUrl = `${network.reservoirBaseUrl}/tokens/v7?tokens=${contract}:${tokenId}`;
      const apiKey = process.env.NEXT_PUBLIC_RESERVOIR_API_KEY || 'demo-api-key';
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-api-key': apiKey
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch NFT data: ${response.status}`);
      }
      
      const data = await response.json();
      const nft = data.tokens?.[0];
      
      if (!nft) {
        throw new Error('NFT not found');
      }
      
      const name = nft.token?.name || `NFT #${tokenId}`;
      const image = nft.token?.image || '/logo.png';
      const price = nft.market?.floorAsk?.price?.amount?.native || 'Not for sale';
      const currency = nft.market?.floorAsk?.price?.currency?.symbol || 'ETH';
      
      const buyUrl = `${baseUrl}?tab=marketplace&network=${networkId}&contract=${contract}&tokenId=${tokenId}&action=buy`;
      
      // Retornar um frame com duas opções: compra direta via tx ou abrir no marketplace
      const hasTxDetails = nft.market?.floorAsk?.id && 
                        nft.market?.floorAsk?.price && 
                        nft.token?.contract && 
                        nft.token?.tokenId;
                        
      // URL para transação no Warpcast
      // Formato do deep link para a Farcaster wallet: ethereum:{contractAddress}@{chainId}/transferFrom?address={to}&tokenId={id}
      // Para compra de NFT, é mais complexo e pode precisar ajustes mais avançados
      const chainId = networkId === '1' ? '1' : '8453'; // ETH ou Base
      const marketplaceContractAddress = network.reservoirBaseUrl.includes('base') 
        ? process.env.BASE_MARKETPLACE_CONTRACT 
        : process.env.ETH_MARKETPLACE_CONTRACT;
      
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <meta property="fc:frame" content="vNext">
            <meta property="fc:frame:title" content="Buy ${name}">
            <meta property="fc:frame:image" content="${image}">
            <meta property="fc:frame:post_url" content="${baseUrl}/api/frames/nft/action">
            
            <meta property="fc:frame:button:1" content="Open in Marketplace">
            <meta property="fc:frame:button:1:action" content="link">
            <meta property="fc:frame:button:1:target" content="${buyUrl}">
            
            <meta property="fc:frame:button:2" content="Go back">
            
            <meta property="fc:frame:state" content="${Buffer.from(JSON.stringify({
              networkId,
              contract,
              tokenId,
              action: 'buy',
              image: image,
              name: name
            })).toString('base64')}">
          </head>
          <body>
            <h1>Ready to Buy ${name}</h1>
            <p>Price: ${price} ${currency}</p>
            <p>To complete your purchase, please open in our marketplace.</p>
          </body>
        </html>`,
        {
          headers: { 'Content-Type': 'text/html' }
        }
      );
    } catch (error) {
      console.error('Error preparing purchase:', error);
      
      // Em caso de erro, retornar um frame de erro
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <meta property="fc:frame" content="vNext">
            <meta property="fc:frame:title" content="Error">
            <meta property="fc:frame:image" content="/logo.png">
            <meta property="fc:frame:post_url" content="${baseUrl}/api/frames/nft/action">
            
            <meta property="fc:frame:button:1" content="Try Again">
            
            <meta property="fc:frame:state" content="${Buffer.from(JSON.stringify({
              action: 'error'
            })).toString('base64')}">
          </head>
          <body>
            <h1>Error</h1>
            <p>Failed to prepare purchase. Please try again.</p>
            <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
          </body>
        </html>`,
        {
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }
    
  } catch (error) {
    console.error('Frame action error:', error);
    
    // Retornar um frame de erro conforme recomendação da documentação
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <meta property="fc:frame" content="vNext">
          <meta property="fc:frame:title" content="Error">
          <meta property="fc:frame:image" content="/logo.png">
          <meta property="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin}/api/frames/nft/action">
          
          <meta property="fc:frame:button:1" content="Try Again">
          
          <meta property="fc:frame:state" content="${Buffer.from(JSON.stringify({
            action: 'error'
          })).toString('base64')}">
        </head>
        <body>
          <h1>Error</h1>
          <p>Something went wrong. Please try again.</p>
          <p>Error details: ${error instanceof Error ? error.message : 'Unknown error'}</p>
        </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }
}
