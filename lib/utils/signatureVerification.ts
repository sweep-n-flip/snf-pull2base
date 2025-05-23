// Importing NodeJS Buffer for decoding base64
import { Buffer } from 'buffer';

/**
 * Interface for parsed Farcaster message data
 */
export interface FarcasterMessageData {
  verified: boolean;
  message?: {
    fid?: number;
    address?: string;
    custodyAddress?: string;
    wallets?: Array<{ address: string; chain: string }>;
  };
  raw: string;
}

/**
 * Verifies the signature of trusted data from Farcaster frames.
 * 
 * This is a simplified implementation for development. For production,
 * it's recommended to use the Farcaster SDK for proper validation.
 * 
 * @param trustedData The trusted data to verify.
 * @returns True in development mode, in production would validate the signature.
 */
export async function verifySignature(trustedData: string | undefined): Promise<boolean> {
  try {
    // For development, just check if trustedData exists
    if (!trustedData) {
      console.log('No trusted data provided');
      return false;
    }

    // In development, we bypass validation
    console.log('Signature verification bypassed for development');
    return true;
    
    // In production, you would use the Farcaster Frame SDK to validate signatures
    // This requires proper dependencies and environment setup
  } catch (error) {
    console.error('Error in signature verification:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Extracts wallet address from Farcaster Frame trusted data
 * 
 * @param trustedData Base64 encoded trusted data from Farcaster
 * @returns Wallet address if found, or null
 */
export async function extractWalletFromTrustedData(trustedData: string | undefined): Promise<string | null> {
  if (!trustedData) {
    console.log('No trusted data provided for wallet extraction');
    return null;
  }

  try {
    // Try to decode as base64
    let decodedData: any;
    try {
      // First attempt to decode the base64 string
      const decoded = Buffer.from(trustedData, 'base64').toString();
      decodedData = JSON.parse(decoded);
      console.log('Successfully decoded trusted data from base64');
    } catch (e) {
      // If not base64, try parsing as JSON directly
      try {
        decodedData = JSON.parse(trustedData);
        console.log('Parsed trusted data directly as JSON');
      } catch (jsonError) {
        console.log('Could not parse trusted data as JSON');
        // Keep the original data
        decodedData = trustedData;
      }
    }

    // Log structure for debugging
    console.log('Trusted data structure:', JSON.stringify(decodedData, null, 2).substring(0, 500));

    // Extract wallet address from various possible locations
    if (typeof decodedData === 'object' && decodedData !== null) {
      // Check common Farcaster custody address locations
      if (decodedData.custodyAddress && typeof decodedData.custodyAddress === 'string' && 
          decodedData.custodyAddress.startsWith('0x')) {
        return decodedData.custodyAddress;
      }

      // Check for embedded message data
      if (decodedData.message && typeof decodedData.message === 'object') {
        if (decodedData.message.custodyAddress && 
            typeof decodedData.message.custodyAddress === 'string' && 
            decodedData.message.custodyAddress.startsWith('0x')) {
          return decodedData.message.custodyAddress;
        }
      }

      // Check for wallet info
      if (decodedData.walletAddress && typeof decodedData.walletAddress === 'string' && 
          decodedData.walletAddress.startsWith('0x')) {
        return decodedData.walletAddress;
      }
    }

    // If we couldn't find an address in trusted data
    console.log('No wallet address found in trusted data');
    return null;
  } catch (error) {
    console.error('Error extracting wallet from trusted data:', error instanceof Error ? error.message : String(error));
    return null;
  }
}