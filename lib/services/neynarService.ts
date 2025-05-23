import { Configuration, NeynarAPIClient } from '@neynar/nodejs-sdk';

// Singleton instance of the Neynar client
let neynarClient: NeynarAPIClient | null = null;

/**
 * Gets or creates a Neynar API client instance
 * @returns NeynarAPIClient instance
 */
export function getNeynarClient(): NeynarAPIClient {
  if (!neynarClient) {
    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) {
      throw new Error('NEYNAR_API_KEY environment variable is not set');
    }
    
    const config = new Configuration({ apiKey });
    neynarClient = new NeynarAPIClient(config);
  }
  
  return neynarClient;
}

/**
 * Interface for the validated frame action response from Neynar
 */
export interface ValidatedFrameAction {
  valid: boolean;
  action?: {
    url: string;
    interactor?: {
      fid: number;
      username?: string;
      custody_address?: string;
      verified_addresses?: {
        eth_addresses?: string[];
        sol_addresses?: string[];
        primary?: {
          eth_address?: string | null;
          sol_address?: string | null;
        }
      }
    };
    tapped_button?: {
      index: number;
    };
    input?: {
      text: string;
    };
    state?: {
      serialized: string;
    };
    cast?: {
      hash: string;
      author?: {
        fid: number;
      }
    };
    transaction?: {
      hash: string;
    };
  };
  error?: string;
}

/**
 * Validates a Farcaster Frame action using Neynar's API
 * @param messageBytes - The message bytes from the frame request (trustedData)
 * @returns ValidatedFrameAction with user and action information
 */
export async function validateFrameAction(messageBytes: string): Promise<ValidatedFrameAction> {
  try {
    const client = getNeynarClient();
    
    // Convert to hex if not already in hex format
    const messageHex = messageBytes.startsWith('0x') 
      ? messageBytes 
      : Buffer.from(messageBytes, 'utf8').toString('hex');
    
    // Call Neynar's validate frame action API with proper parameters
    const response = await client.validateFrameAction({
      messageBytesInHex: messageHex,
      // Optional context parameters can be set if needed
      castReactionContext: true
    });
    
    // Convert the response to our interface format
    return {
      valid: response.valid,
      action: response.valid && response.action ? {
        url: response.action.url,
        interactor: response.action.interactor ? {
          fid: response.action.interactor.fid,
          username: response.action.interactor.username,
          custody_address: response.action.interactor.custody_address,
          verified_addresses: response.action.interactor.verified_addresses
        } : undefined,
        tapped_button: response.action.tapped_button,
        input: response.action.input && response.action.input.text ? { 
          text: response.action.input.text 
        } : undefined,
        state: response.action.state,
        cast: response.action.cast,
        transaction: response.action.transaction
      } : undefined,
      error: undefined
    };
  } catch (error) {
    console.error('Error validating frame action:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error validating frame'
    };
  }
}

/**
 * Extracts the wallet address from a validated frame action
 * 
 * @param validatedAction - The validated frame action from Neynar
 * @returns The most appropriate wallet address or null if none found
 */
export function extractWalletFromValidatedAction(validatedAction: ValidatedFrameAction): string | null {
  if (!validatedAction.valid || !validatedAction.action?.interactor) {
    return null;
  }
  
  const interactor = validatedAction.action.interactor;
  
  // Priority 1: Direct custody address
  if (interactor.custody_address && interactor.custody_address.startsWith('0x')) {
    console.log('Using custody_address from validated action:', interactor.custody_address);
    return interactor.custody_address;
  }
  
  // Priority 2: Primary ethereum address from verified addresses
  const primaryEthAddress = interactor.verified_addresses?.primary?.eth_address;
  if (primaryEthAddress && typeof primaryEthAddress === 'string') {
    console.log('Using primary eth_address from validated action:', primaryEthAddress);
    return primaryEthAddress;
  }
  
  // Priority 3: First ethereum address from verified addresses array
  if (interactor.verified_addresses?.eth_addresses?.length) {
    const firstAddress = interactor.verified_addresses.eth_addresses[0];
    console.log('Using first eth_address from validated action:', firstAddress);
    return firstAddress;
  }
  
  // Fall back to FID placeholder if we have an FID
  if (interactor.fid) {
    console.log('No wallet address found, returning FID placeholder');
    return `fid:${interactor.fid}`;
  }
  
  // No wallet address found
  return null;
}

/**
 * Gets user information by Farcaster ID
 * @param fid - Farcaster ID number
 * @returns User object or null if not found
 */
export async function getUserByFid(fid: number) {
  try {
    const client = getNeynarClient();
    const response = await client.fetchBulkUsers({ fids: [fid] });
    
    if (response.users && response.users.length > 0) {
      return response.users[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching user by FID:', error);
    return null;
  }
}

/**
 * Sends a Frame notification to a user
 * 
 * @param fid - Farcaster ID to send the notification to
 * @param title - Notification title
 * @param body - Notification body
 * @param targetUrl - Optional URL to direct the user to
 * @returns Success or failure information
 */
export async function sendFrameNotification(
  fid: number, 
  title: string, 
  body: string,
  targetUrl?: string
) {
  try {
    const client = getNeynarClient();
    const targetFids = [fid];
    const notification = {
      title,
      body,
      target_url: targetUrl || process.env.NEXT_PUBLIC_BASE_URL || '',
    };

    const result = await client.publishFrameNotifications({ 
      targetFids, 
      notification 
    });

    if (result.notification_deliveries.length > 0) {
      return { success: true };
    } else {
      return { 
        success: false, 
        reason: 'No notification delivered' 
      };
    }
  } catch (error) {
    console.error('Error sending frame notification:', error);
    return { 
      success: false, 
      reason: error instanceof Error ? error.message : 'Unknown error sending notification'
    };
  }
}
