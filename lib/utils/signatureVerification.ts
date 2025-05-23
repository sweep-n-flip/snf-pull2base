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
 * This implementation handles various Farcaster/Warpcast data formats.
 * 
 * @param trustedData The trusted data containing message bytes
 * @param untrustedData Optional untrusted data to use as fallback
 * @returns The wallet address if found, ${WALLET} placeholder, or null
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
      
      // Check new transaction.from field (available in newer Farcaster versions)
      if (untrustedData.transaction && untrustedData.transaction.from) {
        const txFrom = untrustedData.transaction.from;
        if (typeof txFrom === 'string' && txFrom.startsWith('0x')) {
          console.log('Found address in transaction.from:', txFrom);
          return txFrom;
        }
      }
      
      // Look in the wallets array (Warpcast format)
      if (untrustedData.wallets && Array.isArray(untrustedData.wallets)) {
        for (const wallet of untrustedData.wallets) {
          if (wallet && wallet.address && typeof wallet.address === 'string' && wallet.address.startsWith('0x')) {
            console.log('Found address in wallets array:', wallet.address);
            return wallet.address;
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
      
      // If we have FID but no wallet, we can use the Farcaster placeholder
      if (untrustedData.fid) {
        console.log('No wallet address found, but have FID:', untrustedData.fid);
        console.log('Using ${WALLET} placeholder for Farcaster transaction');
        return '${WALLET}'; // Return the Farcaster placeholder
      }
    }
    
    // If no wallet address or FID was found, use the Farcaster placeholder as fallback
    console.log('No wallet information found, defaulting to ${WALLET} placeholder');
    return '${WALLET}';
  } catch (error) {
    console.error('Error extracting wallet:', error);
    // In case of errors, default to the placeholder to prevent transaction failures
    return '${WALLET}';
  }
}