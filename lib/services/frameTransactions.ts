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
  txInfo?: {
    to: string;
    data: string;
    value: string;
    chainId: string;
  };
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
    console.log('Starting frame purchase preparation:', {
      network: network.name,
      contract,
      tokenId,
      userAddress: userAddress === '${WALLET}' ? 'PLACEHOLDER' : userAddress,
      baseUrl
    });

    // 1. Buscar dados do NFT na Reservoir
    const apiUrl = `${network.reservoirBaseUrl}/tokens/v7?tokens=${contract}:${tokenId}`;
    
    // Verificar e usar a chave API específica para a rede se disponível
    const networkApiKey = network.chainId === 1 
      ? process.env.NEXT_PUBLIC_RESERVOIR_ETH_API_KEY 
      : network.chainId === 8453 
        ? process.env.NEXT_PUBLIC_RESERVOIR_BASE_API_KEY
        : null;
    
    const apiKey = networkApiKey || process.env.NEXT_PUBLIC_RESERVOIR_API_KEY || 'demo-api-key';
    
    console.log(`Fetching NFT data from ${network.name} (chainId: ${network.chainId}):`, {
      url: apiUrl,
      apiKey: apiKey.substring(0, 8) + '***' 
    });
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'x-api-key': apiKey
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch NFT data:', { status: response.status, error: errorText });
      throw new Error(`Failed to fetch NFT data: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('NFT data received:', {
      hasTokens: !!data.tokens,
      tokenCount: data.tokens?.length || 0,
      firstToken: data.tokens?.[0] ? 'present' : 'missing'
    });
    
    const nft = data.tokens?.[0];
    
    if (!nft || !nft.token) {
      console.error('NFT not found in response:', data);
      throw new Error('NFT not available or not found');
    }

    // Verificar se o NFT está à venda
    if (!nft.market?.floorAsk?.id) {
      console.warn('NFT not for sale:', {
        contract,
        tokenId,
        hasMarket: !!nft.market,
        hasFloorAsk: !!nft.market?.floorAsk,
        hasId: !!nft.market?.floorAsk?.id
      });
      
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
        price: 'Not for sale',
        currency: 'ETH'
      };
    }
    
    // 2. Preparar dados da transação com validação melhorada
    const orderId = nft.market.floorAsk.id;
    
    // Validar se temos um endereço de wallet válido ou usar placeholder
    // Usamos ${WALLET} como placeholder padrão para frames Farcaster
    // Se o endereço for inválido ou contém o placeholder, usamos o padrão
    const taker = userAddress && userAddress.startsWith('0x') && !userAddress.includes('${WALLET}') 
      ? userAddress 
      : "${WALLET}";
    
    console.log('Preparing transaction with parameters:', {
      network: network.name,
      orderId,
      taker,
      baseUrl,
      usingWalletPlaceholder: taker === "${WALLET}",
      priceNative: nft.market?.floorAsk?.price?.amount?.native,
      currency: nft.market?.floorAsk?.price?.currency?.symbol
    });
    
    const txData = await getReservoirExecuteData(network, {
      orderId: orderId,
      quantity: 1,
      taker: taker,
      source: "pull2base-frame",
      referrer: baseUrl
    });
    
    if (!txData || !txData.step?.action?.data) {
      console.error('Invalid transaction data received:', {
        hasTxData: !!txData,
        hasStep: !!txData?.step,
        hasAction: !!txData?.step?.action,
        hasData: !!txData?.step?.action?.data,
        txData: txData ? JSON.stringify(txData, null, 2) : 'null'
      });
      throw new Error('Failed to prepare transaction - invalid response from Reservoir');
    }
    
    // Validar dados essenciais da transação
    const actionData = txData.step.action.data;
    if (!actionData.to || !actionData.data) {
      console.error('Missing required transaction fields:', {
        hasTo: !!actionData.to,
        hasData: !!actionData.data,
        toValue: actionData.to,
        dataLength: actionData.data ? actionData.data.length : 0
      });
      throw new Error('Transaction data missing required fields (to, data)');
    }
    
    // Log the transaction data for debugging
    console.log('Generated transaction data:', {
      txUrl: txData.txUrl,
      hasStep: !!txData.step,
      hasAction: !!txData.step?.action,
      hasData: !!txData.step?.action?.data,
      to: actionData.to,
      dataLength: actionData.data.length,
      value: actionData.value || '0'
    });
    
    // 3. Retornar dados formatados para uso no Frame
    // Garantir que o valor está no formato correto (hexadecimal)
    let finalValue = actionData.value || '0';
    if (finalValue && !finalValue.startsWith('0x')) {
      if (!isNaN(Number(finalValue))) {
        finalValue = '0x' + Number(finalValue).toString(16);
      } else {
        finalValue = '0x0';
      }
    }

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
      // Incluir dados de transação para o endpoint /transaction
      txInfo: {
        to: actionData.to,
        data: actionData.data,
        value: finalValue,
        chainId: network.chainId.toString()
      },
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
