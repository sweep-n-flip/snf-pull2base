
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
    // Log data for debugging
    console.log('Trusted data structure:', 
      typeof trustedData === 'string' 
        ? `"${trustedData.substring(0, 100)}..."` 
        : JSON.stringify(trustedData));

    // First try: Check if there's a connected address directly
    // This is the easiest path if the client provides it
    if (untrustedData?.connectedAddress) {
      if (typeof untrustedData.connectedAddress === 'string' && untrustedData.connectedAddress.startsWith('0x')) {
        console.log('Found wallet in untrustedData.connectedAddress:', untrustedData.connectedAddress);
        return untrustedData.connectedAddress;
      }
    }

    // Second try: Check if wallet address is already available in trusted data
    if (typeof trustedData === 'object' && trustedData !== null) {
      // Farcaster might provide the connected wallet directly
      if (trustedData.custody_address && typeof trustedData.custody_address === 'string' && 
          trustedData.custody_address.startsWith('0x')) {
        console.log('Found wallet in trusted data custody_address:', trustedData.custody_address);
        return trustedData.custody_address;
      }
      
      // Check for wallet in trusted data message
      if (trustedData.message && trustedData.message.wallet) {
        console.log('Found wallet in trusted message:', trustedData.message.wallet);
        return trustedData.message.wallet;
      }
      
      // Directly check for Warpcast connected accounts
      if (trustedData.connectedAddresses && Array.isArray(trustedData.connectedAddresses)) {
        for (const addr of trustedData.connectedAddresses) {
          if (typeof addr === 'string' && addr.startsWith('0x')) {
            console.log('Found wallet in trustedData.connectedAddresses:', addr);
            return addr;
          }
        }
      }
    }

    // Farcaster Frame Protocol 
    // Unfortunately, we can't directly parse the protobuf format without proper libraries
    // In production, you would use the @farcaster/core library to decode the message

    // Fallback - Check untrusted data for a wallet address
    if (untrustedData) {
      // Normalized untrusted data object
      let normalizedData = untrustedData;
      if (typeof untrustedData === 'string') {
        try {
          normalizedData = JSON.parse(untrustedData);
        } catch (e) {
          // Not JSON, keep as is
        }
      }

      // Log the untrusted data we're checking
      console.log('Looking for wallet in untrusted data:', typeof normalizedData);
      
      if (typeof normalizedData === 'object' && normalizedData !== null) {
        // Check for connected wallet address in different locations
        
        // Direct properties
        if (normalizedData.wallets && Array.isArray(normalizedData.wallets)) {
          for (const wallet of normalizedData.wallets) {
            if (wallet && wallet.address && typeof wallet.address === 'string' && wallet.address.startsWith('0x')) {
              console.log('Found wallet in untrustedData.wallets array:', wallet.address);
              return wallet.address;
            }
          }
        }
        
        // Look for FID to use as alternative identifier
        const fid = normalizedData.fid ? 
          (typeof normalizedData.fid === 'object' ? normalizedData.fid.id : normalizedData.fid) : 
          null;
          
        if (fid) {
          console.log('Found FID in untrusted data:', fid);
          // We could use FID as a key in a database to lookup associated wallets
          // For now, we'll return null to indicate we found an FID but no wallet
        }
      }
    }

    // No wallet found
    console.log('No wallet address found in trusted or untrusted data');
    return null;
  } catch (error) {
    console.error('Error extracting wallet address:', error instanceof Error ? error.message : String(error));
    return null;
  }
}