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
    
    switch (buttonId) {
      case "1": // Buy NFT
        const redirectUrl = `${baseUrl}?tab=marketplace&network=${networkId}&contract=${contract}&tokenId=${tokenId}&action=buy`;
        
        // Retornando 302 Found com Location header conforme especificação de frames
        return new Response(null, {
          status: 302,
          headers: {
            'Location': redirectUrl,
            'Content-Type': 'text/html'
          }
        });
        
      case "2": // View Details
        // Mostrar mais detalhes sobre a NFT - buscar de API se possível
        try {
          // Buscar dados atualizados da NFT para mostrar detalhes
          const apiUrl = `${network.reservoirBaseUrl}/tokens/v7?tokens=${contract}:${tokenId}&includeAttributes=true`;
          const apiKey = process.env.NEXT_PUBLIC_RESERVOIR_API_KEY || 'demo-api-key';
          
          const nftDetailsResponse = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'accept': 'application/json',
              'x-api-key': apiKey
            }
          });
          
          if (!nftDetailsResponse.ok) {
            throw new Error(`Failed to fetch NFT details: ${nftDetailsResponse.statusText}`);
          }
          
          const nftData = await nftDetailsResponse.json();
          const nft = nftData.tokens?.[0];
          
          // Extrair detalhes relevantes
          const name = nft?.token?.name || `NFT #${tokenId}`;
          const collection = nft?.token?.collection?.name || 'Unknown Collection';
          const image = nft?.token?.image || '/p2b.png';
          const price = nft?.market?.floorAsk?.price?.amount?.native || 'Not for sale';
          const currency = nft?.market?.floorAsk?.price?.currency?.symbol || 'ETH';
          
          // Retornar frame com detalhes da NFT
          return new NextResponse(
            `<!DOCTYPE html>
            <html>
              <head>
                <meta property="fc:frame" content="vNext">
                <meta property="fc:frame:title" content="NFT Details: ${name}">
                <meta property="fc:frame:image" content="${image}">
                <meta property="fc:frame:post_url" content="${baseUrl}/api/frames/nft/action">
                
                <meta property="fc:frame:button:1" content="View in Marketplace">
                <meta property="fc:frame:button:1:action" content="link">
                <meta property="fc:frame:button:1:target" content="${baseUrl}?tab=marketplace&network=${networkId}&contract=${contract}&tokenId=${tokenId}">
                
                <meta property="fc:frame:button:2" content="Share NFT">
                
                <meta property="fc:frame:state" content="${Buffer.from(JSON.stringify({
                  networkId,
                  contract,
                  tokenId,
                  action: 'view_details',
                  image: image,
                  title: name
                })).toString('base64')}">
              </head>
              <body>
                <h1>${name}</h1>
                <p>Collection: ${collection}</p>
                <p>Price: ${price} ${currency}</p>
                <p>Network: ${network.name}</p>
                <img src="${image}" alt="${name}" style="max-width: 100%">
              </body>
            </html>`,
            {
              headers: { 'Content-Type': 'text/html' },
            }
          );
        } catch (error) {
          console.error('Error fetching NFT details:', error);
          
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
                <p>Error: Failed to fetch NFT details</p>
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
        
      case "3": // Share
        try {
          // Buscar dados da NFT diretamente da API para garantir que temos as informações mais atuais
          // Isso permite ter informações mais precisas sem depender apenas do state
          const apiUrl = `${baseUrl}/api/frames/nft?network=${networkId}&contract=${contract}&tokenId=${tokenId}`;
          const nftResponse = await fetch(apiUrl).then(res => res.text());
          
          // Extrair metadados da resposta - usando fc:frame:image e fc:frame:title conforme especificação
          const titleMatch = nftResponse.match(/<meta (name|property)="fc:frame:title" content="([^"]*)"/);
          const imageMatch = nftResponse.match(/<meta (name|property)="fc:frame:image" content="([^"]*)"/);

          const title = titleMatch ? titleMatch[2] : `NFT #${tokenId}`;
          const image = imageMatch ? imageMatch[2] : `/p2b.png`;
          
          // Criar a URL compartilhável
          const frameUrl = new URL(`${baseUrl}/api/frames/nft`);
          frameUrl.searchParams.append('network', networkId);
          frameUrl.searchParams.append('contract', contract);
          frameUrl.searchParams.append('tokenId', tokenId);
        
          const shareText = `Check out this NFT: ${title}`;
          const warpcastUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(frameUrl.toString())}`;
          
          // Retornar o HTML com todos os requisitos da especificação de frames
          return new NextResponse(
            `<!DOCTYPE html>
            <html>
              <head>
                <meta property="fc:frame" content="vNext">
                <meta property="fc:frame:title" content="Share this NFT">
                <meta property="fc:frame:image" content="${image}">
                <meta property="fc:frame:post_url" content="${baseUrl}/api/frames/nft/action">
                
                <meta property="fc:frame:button:1" content="Share on Warpcast">
                <meta property="fc:frame:button:1:action" content="link">
                <meta property="fc:frame:button:1:target" content="${warpcastUrl}">
                
                <meta property="fc:frame:state" content="${Buffer.from(JSON.stringify({
                  networkId,
                  contract,
                  tokenId,
                  action: 'share',
                  image: image,
                  title: title
                })).toString('base64')}">
              </head>
              <body>
                <h1>Share NFT: ${title}</h1>
                <p>Click the button to share this NFT on Warpcast</p>
                <img src="${image}" alt="${title}" style="max-width: 100%;">
              </body>
            </html>`,
            {
              headers: { 'Content-Type': 'text/html' },
            }
          );
        } catch (error) {
          console.error('Error fetching NFT data for sharing:', error);
          
          // CORREÇÃO: Retornar HTML em vez de JSON
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
                <p>Error: Failed to prepare sharing data</p>
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
        
      default:
        // CORREÇÃO: Retornar HTML em vez de JSON
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
              <p>Error: Invalid button selection</p>
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
