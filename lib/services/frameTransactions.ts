import { MainnetNetwork } from './mainnetReservoir';
import { getReservoirExecuteData } from './reservoirTx';

// Interface para dados de NFT preparados para frames
export interface FrameNFTData {
  success: boolean;
  error?: string;
  nft?: {
    name: string;
    image: string;
    contract: string;
    tokenId: string;
    description?: string;
    attributes?: Array<{ key: string; value: string }>;
    owner?: string;
  };
  txUrl?: string;
  price?: number | string;
  currency?: string;
  orderId?: string;
}

/**
 * Serviço específico para gerenciar transações iniciadas por Frames
 * Prepara os dados para compra de NFT diretamente de um Frame Farcaster
 */
export async function prepareFramePurchaseTransaction(
  network: MainnetNetwork,
  contract: string,
  tokenId: string,
  userAddress: string,
  baseUrl: string
): Promise<FrameNFTData> {
  try {
    // 1. Buscar dados do NFT na Reservoir
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
    
    if (!nft || !nft.token) {
      throw new Error('NFT not available');
    }

    // Verificar se o NFT está à venda
    if (!nft.market?.floorAsk?.id) {
      return {
        success: false,
        error: 'NFT not for sale',
        nft: {
          name: nft.token?.name || `NFT #${tokenId}`,
          image: nft.token?.image || '/logo.png',
          contract: nft.token?.contract || contract,
          tokenId: nft.token?.tokenId || tokenId,
          description: nft.token?.description,
          attributes: nft.token?.attributes,
          owner: nft.token?.owner
        },
        price: nft.market?.floorAsk?.price?.amount?.native || 'Not for sale',
        currency: nft.market?.floorAsk?.price?.currency?.symbol || 'ETH'
      };
    }
    
    // 2. Preparar dados da transação
    const orderId = nft.market.floorAsk.id;
    
    // Use the wallet placeholder in a format Warpcast/Farcaster can use
    // For Farcaster Frame, use ${userAddress} as placeholder for the user's wallet
    // This enables direct wallet integration in frames
    const effectiveAddress = userAddress && userAddress.startsWith('0x') 
      ? userAddress 
      : "${userAddress}"; // Use Farcaster variable format for wallet injection
      
    console.log(`Using address for transaction: ${effectiveAddress}`);
    
    const txData = await getReservoirExecuteData(network, {
      orderId: orderId,
      quantity: 1,
      taker: effectiveAddress,
      source: "pull2base-frame",
      referrer: baseUrl
    });
    
    if (!txData || !txData.txUrl) {
      throw new Error('Failed to prepare transaction');
    }
    
    // 3. Retornar dados formatados para uso no Frame
    return {
      success: true,
      nft: {
        name: nft.token?.name || `NFT #${tokenId}`,
        image: nft.token?.image || '/logo.png',
        contract: nft.token?.contract || contract,
        tokenId: nft.token?.tokenId || tokenId,
        description: nft.token?.description,
        attributes: nft.token?.attributes,
        owner: nft.token?.owner
      },
      txUrl: txData.txUrl,
      price: nft.market?.floorAsk?.price?.amount?.native || 0,
      currency: nft.market?.floorAsk?.price?.currency?.symbol || 'ETH',
      orderId: orderId
    };
  } catch (error) {
    console.error('Error preparing frame purchase:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error preparing purchase'
    };
  }
}
