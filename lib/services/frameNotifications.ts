import { getUserByFid, sendFrameNotification } from './neynarService';

/**
 * Send a notification to a user about their NFT transaction
 * 
 * @param fid Farcaster ID of the user
 * @param status Status of the transaction ('success', 'pending', 'failed')
 * @param nftName Name of the NFT
 * @param transactionHash Optional transaction hash
 * @param networkName Optional network name
 * @returns Result of notification sending
 */
export async function sendNFTTransactionNotification(
  fid: number, 
  status: 'success' | 'pending' | 'failed',
  nftName: string,
  transactionHash?: string,
  networkName?: string
) {
  try {
    // Get user info for personalized message
    let username = `user #${fid}`;
    try {
      const user = await getUserByFid(fid);
      if (user?.username) {
        username = user.username;
      }
    } catch (error) {
      console.log('Error fetching user by FID, using default username:', error);
      // Continue with default username
    }
    
    // Create appropriate message based on status
    let title: string;
    let body: string;
    let targetUrl: string | undefined;
    
    // Prepare base URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://your-app.com';
    
    switch (status) {
      case 'success':
        title = '✅ NFT Purchase Successful!';
        body = `Hey ${username}, your purchase of ${nftName} was successful!`;
        
        // Create etherscan link if transaction hash is available
        if (transactionHash && networkName) {
          const explorerUrl = getExplorerUrl(networkName, transactionHash);
          targetUrl = explorerUrl;
        }
        break;
        
      case 'pending':
        title = '⏳ NFT Purchase Processing';
        body = `Hey ${username}, your purchase of ${nftName} is being processed...`;
        
        // Create etherscan link if transaction hash is available
        if (transactionHash && networkName) {
          const explorerUrl = getExplorerUrl(networkName, transactionHash);
          targetUrl = explorerUrl;
        }
        break;
        
      case 'failed':
        title = '❌ NFT Purchase Failed';
        body = `Hey ${username}, there was an issue with your purchase of ${nftName}. Please try again.`;
        
        // Create a link back to the NFT in the marketplace
        targetUrl = baseUrl;
        break;
        
      default:
        title = 'NFT Purchase Update';
        body = `Hey ${username}, here's an update on your purchase of ${nftName}.`;
        targetUrl = baseUrl;
    }
    
    // Try to send the notification, but handle any Neynar API errors gracefully
    try {
      return await sendFrameNotification(fid, title, body, targetUrl);
    } catch (error) {
      // Check if it's a payment required error (402)
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('402') || errorMessage.includes('Payment Required')) {
        console.log('Payment required for notifications, skipping notification:', { title, body });
        return { 
          success: false, 
          reason: 'Payment required for notifications feature', 
          silentFailure: true 
        };
      }
      
      // Re-throw other errors to be caught by the outer catch block
      throw error;
    }
  } catch (error) {
    console.error('Error sending NFT transaction notification:', error);
    return { success: false, reason: 'Error sending notification' };
  }
}

/**
 * Get blockchain explorer URL for a transaction
 * 
 * @param networkName Name or ID of the network
 * @param txHash Transaction hash
 * @returns Explorer URL
 */
function getExplorerUrl(networkName: string, txHash: string): string {
  const network = networkName.toLowerCase();
  
  if (network.includes('ethereum') || network === '1') {
    return `https://etherscan.io/tx/${txHash}`;
  } else if (network.includes('base') || network === '8453') {
    return `https://basescan.org/tx/${txHash}`;
  } else if (network.includes('optimism') || network === '10') {
    return `https://optimistic.etherscan.io/tx/${txHash}`;
  } else if (network.includes('arbitrum') || network === '42161') {
    return `https://arbiscan.io/tx/${txHash}`;
  } else if (network.includes('polygon') || network === '137') {
    return `https://polygonscan.com/tx/${txHash}`;
  } else if (network.includes('zora') || network === '7777777') {
    return `https://explorer.zora.energy/tx/${txHash}`;
  } else {
    // Generic fallback
    return `https://etherscan.io/tx/${txHash}`;
  }
}
