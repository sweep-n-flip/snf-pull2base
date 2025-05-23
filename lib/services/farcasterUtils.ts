// Helper utilities for Farcaster Frame integration
import { MainnetNetwork } from './mainnetReservoir';

/**
 * Extracts transaction parameters from a Farcaster request URL
 * 
 * @param urlString The request URL string
 * @returns Object containing network, contract, and token ID
 */
export function extractNFTParamsFromURL(urlString: string): {
  network?: string;
  contract?: string;
  tokenId?: string;
} {
  try {
    const url = new URL(urlString);
    
    // Extract from URL parameters
    const network = url.searchParams.get('network') || undefined;
    const contract = url.searchParams.get('contract') || undefined;
    const tokenId = url.searchParams.get('tokenId') || undefined;
    
    return {
      network,
      contract,
      tokenId
    };
  } catch (error) {
    console.error('Error extracting NFT params from URL:', error);
    return {};
  }
}

/**
 * Format transaction response for Farcaster Frame
 * 
 * @param chainId Network chain ID (must be prefixed with eip155:)
 * @param to Transaction recipient address
 * @param data Transaction data
 * @param value Transaction value in wei
 * @returns Formatted transaction object
 */
export function formatFrameTransaction(
  chainId: string,
  to: string,
  data: string,
  value: string
): Record<string, string> {
  // Ensure chainId has eip155: prefix
  const formattedChainId = chainId.startsWith('eip155:') 
    ? chainId 
    : `eip155:${chainId}`;
  
  return {
    chainId: formattedChainId,
    to,
    data,
    value: value || '0'
  };
}

/**
 * Get a fully formatted transaction URL for debugging
 * 
 * @param network Network information
 * @param contract NFT contract address
 * @param tokenId Token ID
 * @param baseUrl Base URL for generating links
 * @returns Full URL string for debugging transaction flow
 */
export function getDebugTransactionURL(
  network: MainnetNetwork,
  contract: string, 
  tokenId: string,
  baseUrl: string
): string {
  return `${baseUrl}/api/frames/nft/transaction?` + 
    `network=${network.id}&` + 
    `contract=${contract}&` + 
    `tokenId=${tokenId}`;
}
