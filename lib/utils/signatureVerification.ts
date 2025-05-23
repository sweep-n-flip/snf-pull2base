/**
 * Verifies the signature of trusted data from Farcaster frames.
 * 
 * Uses Neynar API for proper validation in production.
 * 
 * @param trustedData The trusted data to verify.
 * @returns True if signature is valid, false otherwise.
 */
export async function verifySignature(trustedData: string | undefined): Promise<boolean> {
  try {
    // Check if trustedData exists
    if (!trustedData) {
      console.log('No trusted data provided');
      return false;
    }

    // Use Neynar's validation in production
    if (process.env.NODE_ENV === 'production') {
      const { validateFrameAction } = await import('../services/neynarService');
      const validatedAction = await validateFrameAction(trustedData);
      
      if (validatedAction.valid) {
        console.log('Signature successfully verified by Neynar');
        return true;
      } else {
        console.log('Signature validation failed:', validatedAction.error);
        return false;
      }
    } else {
      // In development, we bypass validation for easier testing
      console.log('Signature verification bypassed for development');
      return true;
    }
  } catch (error) {
    console.error('Error in signature verification:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Extract wallet information from Farcaster Frame message bytes.
 * Uses Neynar API for proper validation and extraction in production.
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
    // In production, use Neynar's validation API
    if (process.env.NODE_ENV === 'production') {
      console.log('Using Neynar to validate and extract wallet');
      const { validateFrameAction, extractWalletFromValidatedAction } = await import('../services/neynarService');
      
      // Get the message bytes from trusted data
      const messageBytes = typeof trustedData === 'string' 
        ? trustedData 
        : trustedData.messageBytes;
      
      if (!messageBytes) {
        console.log('No message bytes found in trustedData');
        return null;
      }
      
      // Validate the frame action with Neynar
      const validatedAction = await validateFrameAction(messageBytes);
      
      if (validatedAction.valid) {
        // Extract wallet from the validated action
        return extractWalletFromValidatedAction(validatedAction);
      } else {
        console.log('Frame validation failed:', validatedAction.error);
        // Fall back to legacy extraction
      }
    }
    
    // Legacy extraction logic for development or fallback
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
        return `fid:${untrustedData.fid}`;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting wallet:', error);
    return null;
  }
}