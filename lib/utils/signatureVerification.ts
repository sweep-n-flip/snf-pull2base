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
    console.log('Extracting wallet from frame data:', {
      hasTrustedData: !!trustedData,
      untrustedDataKeys: untrustedData ? Object.keys(untrustedData) : []
    });

    // Check Farcaster Frame-specific formats first
    if (untrustedData) {
      // Check for interactor wallet, which is commonly available
      if (untrustedData.interactor?.verified_accounts) {
        for (const account of untrustedData.interactor.verified_accounts) {
          if (account?.startsWith('0x')) {
            console.log('Found address in interactor.verified_accounts:', account);
            return account;
          }
        }
      }
      
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
      }
      
      // Check for owner_address in untrusted data
      if (untrustedData.owner_address && untrustedData.owner_address.startsWith('0x')) {
        console.log('Found address in owner_address:', untrustedData.owner_address);
        return untrustedData.owner_address;
      }
      
      // Check for direct walletAddress field
      if (untrustedData.walletAddress && untrustedData.walletAddress.startsWith('0x')) {
        console.log('Found address in walletAddress field:', untrustedData.walletAddress);
        return untrustedData.walletAddress;
      }
    }
    
    // For transaction endpoints, we'll use ${WALLET} placeholder
    // which will be replaced by Farcaster with the actual wallet address
    console.log('No wallet address found in frame data - using ${WALLET} placeholder for transaction endpoint');
    return '${WALLET}';
  } catch (error) {
    console.error('Error extracting wallet:', error);
    return '${WALLET}';
  }
}