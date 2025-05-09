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

// Mapeamento dos endpoints da Reservoir por chainId
const RESERVOIR_API_URLS: Record<number, string> = {
  11155111: 'https://api-sepolia.reservoir.tools', // Sepolia
  10143: 'https://api-monad-testnet.reservoir.tools', // Monad Testnet
};

// API Keys por rede (idealmente viriam das variáveis de ambiente)
const API_KEYS: Record<number, string> = {
  11155111: process.env.NEXT_PUBLIC_RESERVOIR_API_KEY || 'demo-api-key',
  10143: process.env.NEXT_PUBLIC_RESERVOIR_API_KEY || 'demo-api-key',
};

/**
 * Obtém coleções populares de uma rede específica
 */
export async function getCollectionsByNetwork(network: Network, limit = 10): Promise<ReservoirCollection[]> {
  try {
    const apiUrl = RESERVOIR_API_URLS[network.chainId];
    
    if (!apiUrl) {
      throw new Error(`API Reservoir não disponível para a rede ${network.name}`);
    }

    const apiKey = API_KEYS[network.chainId];
    
    const response = await fetch(
      `${apiUrl}/collections/v7?limit=${limit}&sortBy=allTimeVolume&includeTopBid=false`,
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
    return data.collections || [];
  } catch (error) {
    console.error('Erro ao buscar coleções:', error);
    return [];
  }
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