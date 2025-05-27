// Serviço para buscar dados de NFTs da API Reservoir
// https://nft.reservoir.tools/reference/nft-data-overview

import { Network } from "@/app/components/nft/NetworkSelector";

// Definições de tipos para resposta da API Reservoir
export interface ReservoirCollection {
  id: string;
  name: string;
  slug: string;
  symbol: string;
  image: string;
  description?: string;
  contractAddress: string;
  tokenCount?: string;
  floorAskPrice?: {
    amount: {
      native: number;
    };
    currency: {
      symbol: string;
    };
  };
}

export interface ReservoirNFT {
  token: {
    tokenId: string;
    name?: string;
    description?: string;
    image?: string;
    media?: string;
    attributes?: Array<{
      key: string;
      value: string;
    }>;
    owner?: string;
    collection: {
      id: string;
      name: string;
    };
    contract: string;
    isFlagged: boolean;
  };
}

// Mapping of Reservoir endpoints by chainId - Only Sepolia supported
const RESERVOIR_API_URLS: Record<number, string> = {
  11155111: 'https://api-sepolia.reservoir.tools', // Sepolia
};

// API Keys by network (ideally would come from environment variables)
const API_KEYS: Record<number, string> = {
  11155111: process.env.NEXT_PUBLIC_RESERVOIR_API_KEY || 'demo-api-key',
};

// Endereço da coleção específica que queremos mostrar
const ALLOWED_COLLECTION_ADDRESS = '0xA1e094C81E4cB385b40f5B707a4c3657029D6918';

/**
 * Obtém apenas a coleção específica configurada
 */
export async function getCollectionsByNetwork(network: Network, limit = 10): Promise<ReservoirCollection[]> {
  try {
    const apiUrl = RESERVOIR_API_URLS[network.chainId];
    
    if (!apiUrl) {
      throw new Error(`API Reservoir não disponível para a rede ${network.name}`);
    }

    const apiKey = API_KEYS[network.chainId];
    
    // Busca apenas pela coleção específica usando o endereço do contrato
    const response = await fetch(
      `${apiUrl}/collections/v7?contract=${ALLOWED_COLLECTION_ADDRESS}`,
      {
        headers: {
          'accept': '*/*',
          'x-api-key': apiKey
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ao buscar coleções: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Map primaryContract to contractAddress for consistency
    const collections = (data.collections || []).map((collection: any) => ({
      ...collection,
      contractAddress: collection.primaryContract || collection.id
    }));
    
    return collections;
  } catch (error) {
    console.error('Erro ao buscar coleções:', error);
    return [];
  }
}

/**
 * Interface para os dados de venda dos NFTs
 */
export interface NFTSaleData {
  tokenId: string;
  price: string; // Preço em ETH formatado como string
  priceWei: string; // Preço em Wei como string
  seller: string;
  marketplaceAddress: string;
  buyData: string; // Dados para execução da compra
}

/**
 * Obtém tokens (NFTs) de uma coleção específica
 */
export async function getNFTsByCollection(
  network: Network, 
  collectionId: string, 
  limit = 20
): Promise<ReservoirNFT[]> {
  try {
    const apiUrl = RESERVOIR_API_URLS[network.chainId];
    
    if (!apiUrl) {
      throw new Error(`API Reservoir não disponível para a rede ${network.name}`);
    }
    
    const apiKey = API_KEYS[network.chainId];

    // O endpoint de tokens aceita o ID da coleção (que geralmente é o endereço do contrato)
    const response = await fetch(
      `${apiUrl}/tokens/v7?collection=${collectionId}&limit=${limit}&includeAttributes=true&includeLastSale=false`,
      {
        headers: {
          'accept': '*/*',
          'x-api-key': apiKey
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ao buscar NFTs: ${response.statusText}`);
    }

    const data = await response.json();
    return data.tokens || [];
  } catch (error) {
    console.error('Erro ao buscar NFTs:', error);
    return [];
  }
}

/**
 * Obtém detalhes de uma coleção específica
 */
export async function getCollectionDetails(
  network: Network, 
  collectionId: string
): Promise<ReservoirCollection | null> {
  try {
    const apiUrl = RESERVOIR_API_URLS[network.chainId];
    
    if (!apiUrl) {
      throw new Error(`API Reservoir não disponível para a rede ${network.name}`);
    }
    
    const apiKey = API_KEYS[network.chainId];

    const response = await fetch(
      `${apiUrl}/collections/v7?contract=${collectionId}`,
      {
        headers: {
          'accept': '*/*',
          'x-api-key': apiKey
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ao buscar detalhes da coleção: ${response.statusText}`);
    }

    const data = await response.json();
    return data.collections?.[0] || null;
  } catch (error) {
    console.error('Erro ao buscar detalhes da coleção:', error);
    return null;
  }
}

/**
 * Obtém dados de venda de um NFT específico
 */
export async function getNFTSaleData(
  network: Network,
  contractAddress: string,
  tokenId: string
): Promise<NFTSaleData | null> {
  try {
    const apiUrl = RESERVOIR_API_URLS[network.chainId];
    
    if (!apiUrl) {
      throw new Error(`API Reservoir não disponível para a rede ${network.name}`);
    }
    
    const apiKey = API_KEYS[network.chainId];

    // Endpoint para obter ordens de venda de um token específico
    const response = await fetch(
      `${apiUrl}/orders/asks/v6?token=${contractAddress}:${tokenId}&status=active&sortBy=price&limit=1`,
      {
        headers: {
          'accept': '*/*',
          'x-api-key': apiKey
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ao buscar dados de venda: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Se não houver ordens de venda ativas
    if (!data.orders || data.orders.length === 0) {
      return null;
    }

    const order = data.orders[0];
    
    return {
      tokenId,
      price: order.price?.amount?.native?.toString() || '0',
      priceWei: order.price?.amount?.raw || '0',
      seller: order.maker || '',
      marketplaceAddress: order.exchange || '',
      buyData: order.rawData || ''
    };
  } catch (error) {
    console.error('Erro ao buscar dados de venda do NFT:', error);
    return null;
  }
}