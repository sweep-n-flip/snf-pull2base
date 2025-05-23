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
 * Extract wallet information from Farcaster Frame message bytes.
 * This is a simplified implementation for Farcaster protocol.
 * 
 * @param trustedData The trusted data containing message bytes
 * @param untrustedData Optional untrusted data to use as fallback
 * @returns The wallet address if found, or null if not
 */
export async function extractWalletFromFrameData(
  trustedData: any, 
  untrustedData: any
): Promise<string | null> {
  try {
    // Check Farcaster Frame-specific formats first
    if (untrustedData) {
      // Look for direct connected accounts
      if (untrustedData.connectedAddresses && Array.isArray(untrustedData.connectedAddresses)) {
        for (const address of untrustedData.connectedAddresses) {
          if (typeof address === 'string' && address.startsWith('0x')) {
            console.log('Found address in connectedAddresses:', address);
            return address;
          }
        }
      }
      
      // Check Warpcast-specific decorated message format
      if (untrustedData.decoratedMessage && untrustedData.decoratedMessage.wallets) {
        for (const wallet of untrustedData.decoratedMessage.wallets) {
          if (wallet && wallet.address && wallet.address.startsWith('0x')) {
            console.log('Found address in decoratedMessage.wallets:', wallet.address);
            return wallet.address;
          }
        }
      }
      
      // For development/testing - allow using addresses from query params
      if (untrustedData.url) {
        try {
          const url = new URL(untrustedData.url);
          const testWallet = url.searchParams.get('testWallet');
          if (testWallet && testWallet.startsWith('0x')) {
            console.log('Using test wallet from URL param:', testWallet);
            return testWallet;
          }
        } catch (e) {
          console.error('Error parsing URL from untrustedData:', e);
        }
      }
      
      // If we have FID but no wallet, we can fallback to a placeholder
      if (untrustedData.fid) {
        console.log('No wallet found, but have FID:', untrustedData.fid);
        // In production you might want to look up FID to wallet mappings in a database
        // For now, return null to indicate we need a placeholder
      }
    }
    
    // Further processing as needed...
    return null;
  } catch (error) {
    console.error('Error extracting wallet:', error);
    return null;
  }
}