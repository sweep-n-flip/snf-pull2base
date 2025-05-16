// Service for fetching and buying NFTs on mainnet using the Reservoir API

import { createClient, Execute } from '@reservoir0x/reservoir-sdk';

// Define our own mainnet network type
export type MainnetNetwork = {
  id: number;
  name: string;
  chainId: number;
  currency: string;
  rpcUrl: string;
  blockExplorerUrl: string;
  reservoirBaseUrl: string;
};

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
    lastSale?: {
      price: {
        amount: {
          native: number;
        };
        currency: {
          symbol: string;
        };
      };
    };
  };
  market?: {
    floorAsk?: {
      price?: {
        amount?: {
          native: number;
        };
        currency?: {
          symbol: string;
        };
      };
    };
  };
}

// Definition of supported mainnet networks
export const MAINNET_NETWORKS = [
  {
    id: 1,
    name: "Ethereum",
    chainId: 1,
    currency: "ETH",
    rpcUrl: "https://eth.llamarpc.com",
    blockExplorerUrl: "https://etherscan.io",
    reservoirBaseUrl: "https://api.reservoir.tools"
  },
  {
    id: 2,
    name: "Base",
    chainId: 8453,
    currency: "ETH",
    rpcUrl: "https://mainnet.base.org",
    blockExplorerUrl: "https://basescan.org",
    reservoirBaseUrl: "https://api-base.reservoir.tools"
  }
];

// Mapping of Reservoir endpoints to chain IDs
const RESERVOIR_API_URLS: Record<number, string> = {
  1: 'https://api.reservoir.tools', // Ethereum Mainnet
  8453: 'https://api-base.reservoir.tools', // Base
};

// API Keys by network
const API_KEYS: Record<number, string> = {
  1: process.env.NEXT_PUBLIC_RESERVOIR_API_KEY || 'demo-api-key',
  8453: process.env.NEXT_PUBLIC_RESERVOIR_API_KEY || 'demo-api-key',
};

/**
 * Fetch trending collections for the specific network
 */
export async function getTrendingCollections(
  network: MainnetNetwork, 
  limit = 12
): Promise<ReservoirCollection[]> {
  try {
    const apiUrl = network.reservoirBaseUrl;
    const apiKey = API_KEYS[network.chainId];
    
    // Fetch trending collections
    const response = await fetch(
      `${apiUrl}/collections/v7?sortBy=allTimeVolume&limit=${limit}`,
      {
        headers: {
          'accept': '*/*',
          'x-api-key': apiKey
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Error fetching trending collections: ${response.statusText}`);
    }

    const data = await response.json();
    return data.collections || [];
  } catch (error) {
    console.error('Error fetching trending collections:', error);
    return [];
  }
}

/**
 * Search collections by query term on the specific network
 */
export async function searchCollections(
  network: MainnetNetwork, 
  searchQuery: string, 
  limit = 10
): Promise<ReservoirCollection[]> {
  try {
    const apiUrl = network.reservoirBaseUrl;
    
    if (!apiUrl) {
      throw new Error(`Reservoir API not available for network ${network.name}`);
    }

    const apiKey = API_KEYS[network.chainId];
    
    // Search collections by query term
    const response = await fetch(
      `${apiUrl}/collections/v7?name=${encodeURIComponent(searchQuery)}&limit=${limit}`,
      {
        headers: {
          'accept': '*/*',
          'x-api-key': apiKey
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Error searching collections: ${response.statusText}`);
    }

    const data = await response.json();
    return data.collections || [];
  } catch (error) {
    console.error('Error searching collections:', error);
    return [];
  }
}

/**
 * Get NFTs from a specific collection on the mainnet
 */
export async function getMainnetNFTsByCollection(
  network: MainnetNetwork, 
  collectionId: string, 
  limit = 20
): Promise<ReservoirNFT[]> {
  try {
    const apiUrl = network.reservoirBaseUrl;
    
    if (!apiUrl) {
      throw new Error(`Reservoir API not available for network ${network.name}`);
    }
    
    const apiKey = API_KEYS[network.chainId];

    // Adding flags to include price data
    const response = await fetch(
      `${apiUrl}/tokens/v7?collection=${collectionId}&limit=${limit}&includeAttributes=true&includeLastSale=true&includeMarketData=true`,
      {
        headers: {
          'accept': '*/*',
          'x-api-key': apiKey
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Error fetching NFTs: ${response.statusText}`);
    }

    const data = await response.json();
    return data.tokens || [];
  } catch (error) {
    console.error('Error fetching NFTs:', error);
    return [];
  }
}

export interface NFTBuyAction {
  tokenId: string;
  name?: string;
  price: string; // Price in ETH as a string
  priceWei: string; // Price in Wei as a string
  seller: string;
  marketplaceAddress: string;
  kind: string; // Order type (seaport, etc)
  currency: string;
  buyData: string; // Data for executing the purchase
}

/**
 * Gets the necessary data to purchase a specific NFT
 */
export async function getMainnetNFTBuyData(
  network: MainnetNetwork,
  contractAddress: string,
  tokenId: string
): Promise<NFTBuyAction | null> {
  try {
    const apiUrl = network.reservoirBaseUrl;
    
    if (!apiUrl) {
      throw new Error(`Reservoir API not available for network ${network.name}`);
    }
    
    const apiKey = API_KEYS[network.chainId];

    // Endpoint to get the specific token with market data
    const response = await fetch(
      `${apiUrl}/tokens/v7?tokens=${contractAddress}:${tokenId}&includeAttributes=true&includeTopBid=true&includeRawData=true&includeLastSale=true`,
      {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-api-key': apiKey
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Error fetching buying data: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Check if we have tokens in the results
    if (!data.tokens || data.tokens.length === 0) {
      return null;
    }

    const token = data.tokens[0];
    
    // If there's no market data or sale price
    if (!token.market?.floorAsk?.price?.amount?.native) {
      return null;
    }
    
    return {
      tokenId,
      name: token.token?.name || `Token #${tokenId}`,
      price: token.market?.floorAsk?.price?.amount?.native?.toString() || '0',
      priceWei: token.market?.floorAsk?.price?.amount?.raw || '0',
      seller: token.market?.floorAsk?.maker || '',
      marketplaceAddress: token.market?.floorAsk?.contract || '',
      kind: token.market?.floorAsk?.source?.name || 'unknown',
      currency: token.market?.floorAsk?.price?.currency?.symbol || 'ETH',
      buyData: token.market?.floorAsk?.rawData || ''
    };
  } catch (error) {
    console.error('Error fetching NFT buying data:', error);
    return null;
  }
}

/**
 * Generates the URL for purchasing an NFT
 * This URL will open the purchase page on Reservoir
 */
export function generateBuyUrl(
  network: MainnetNetwork,
  contractAddress: string,
  tokenId: string
): string {
  let baseUrl = 'https://marketplace.reservoir.tools';
  
  if (network.chainId === 8453) {
    baseUrl = 'https://base.reservoir.tools';
  }

  return `${baseUrl}/tokens/${contractAddress}:${tokenId}`;
}

/**
 * Interface for the buy NFT response
 */
export interface BuyNFTResponse {
  success: boolean;
  message?: string;
  txHash?: string;
  error?: string;
  steps?: Execute['steps'];
}

/**
 * Initialize the Reservoir SDK client for a specific network
 */
function getReservoirClient(network: MainnetNetwork) {
  const apiKey = API_KEYS[network.chainId];
  
  // Create client with proper configuration
  return createClient({
    chains: [{
      id: network.chainId,
      name: network.name,
      baseApiUrl: network.reservoirBaseUrl,
      active: true,
    }],
    apiKey: apiKey,
  });
}

/**
 * Buy an NFT directly through Reservoir SDK
 */
export async function buyNFTDirectly(
  network: MainnetNetwork,
  contractAddress: string,
  tokenId: string,
  buyerAddress: string,
  wallet: any // This should be the adapter wallet
): Promise<BuyNFTResponse> {
  try {
    const reservoirClient = getReservoirClient(network);
    
    if (!reservoirClient) {
      throw new Error("Failed to initialize Reservoir client");
    }
    
    if (!wallet) {
      throw new Error("Wallet is required for buying NFTs");
    }
    
    // Format the token identifier
    const token = `${contractAddress}:${tokenId}`;
    
    let steps: Execute['steps'] = [];
    let txHash: string | undefined;
    
    // Following the pattern in useBuyTokens
    await reservoirClient.actions.buyToken({
      items: [{ token }],
      wallet,
      chainId: network.chainId,
      options: {
        skipBalanceCheck: true // Skip balance checking to allow transaction to proceed
      },
      onProgress: (currentSteps: Execute['steps']) => {
        if (!currentSteps) {
          return;
        }
        
        steps = currentSteps;
        
        // Extract transaction hash when available
        if (currentSteps.length >= 2 && 
            currentSteps[1].items?.length && 
            currentSteps[1].items[0].txHashes) {
          txHash = currentSteps[1].items[0].txHashes[0]?.txHash;
        }
      }
    });
    
    return {
      success: true,
      message: 'Purchase in progress',
      txHash,
      steps
    };
  } catch (error) {
    console.error('Error buying NFT directly:', error);
    
    // Handle specific error types (following useBuyTokens pattern)
    if (error && typeof error === 'object') {
      if ('type' in error && error.type === 'price mismatch') {
        return {
          success: false,
          error: 'Price was greater than expected'
        };
      }
      
      if ('message' in error && typeof error.message === 'string') {
        if (error.message.includes('ETH balance')) {
          return {
            success: false,
            error: 'You have insufficient funds to buy this NFT'
          };
        }
        
        if ('code' in error && error.code === 'ACTION_REJECTED') {
          return {
            success: false,
            error: 'You have canceled the transaction'
          };
        }
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
