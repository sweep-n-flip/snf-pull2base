// Monitoring and logging utilities for Farcaster Frame interactions
import { NextRequest } from 'next/server';

/**
 * Log detailed information about Farcaster Frame requests for debugging
 * 
 * @param req The Next.js request object
 * @param context Additional context information
 */
export async function logFrameRequestDetails(
  req: NextRequest, 
  context: Record<string, any> = {}
): Promise<void> {
  try {
    // Base request info
    console.log('===== FARCASTER FRAME REQUEST =====');
    console.log('- Endpoint:', req.url);
    console.log('- Method:', req.method);
    console.log('- Timestamp:', new Date().toISOString());
    
    // Request headers
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log('- Headers:', JSON.stringify(headers, null, 2));
    
    // URL parameters
    const searchParams: Record<string, string> = {};
    req.nextUrl.searchParams.forEach((value, key) => {
      searchParams[key] = value;
    });
    console.log('- Search parameters:', JSON.stringify(searchParams, null, 2));
    
    // Request body if available
    const clonedReq = req.clone();
    try {
      // Try to parse as JSON
      const jsonBody = await clonedReq.json().catch(() => null);
      if (jsonBody) {
        console.log('- JSON body:', JSON.stringify(jsonBody, null, 2));
        
        // Extract Farcaster-specific data
        if (jsonBody.untrustedData) {
          console.log('- Farcaster untrustedData:', JSON.stringify(jsonBody.untrustedData, null, 2));
        }
        if (jsonBody.trustedData) {
          console.log('- Farcaster trustedData present:', !!jsonBody.trustedData);
        }
      } else {
        // Try to get as text if not JSON
        const anotherClone = req.clone();
        const textBody = await anotherClone.text().catch(() => '');
        if (textBody) {
          console.log('- Raw body:', textBody.substring(0, 500) + (textBody.length > 500 ? '...' : ''));
        }
        
        // Try to get as form data
        const formClone = req.clone(); 
        try {
          const formData = await formClone.formData();
          const formEntries: Record<string, string> = {};
          formData.forEach((value, key) => {
            formEntries[key] = value.toString();
          });
          if (Object.keys(formEntries).length > 0) {
            console.log('- Form data:', JSON.stringify(formEntries, null, 2));
          }
        } catch (e) {
          // Form data parsing failed, which is normal for non-form requests
        }
      }
    } catch (e) {
      console.log('- Could not parse request body:', e instanceof Error ? e.message : String(e));
    }
    
    // Additional context
    if (Object.keys(context).length > 0) {
      console.log('- Additional context:', JSON.stringify(context, null, 2));
    }
    
    console.log('===================================');
  } catch (error) {
    // Don't let logging errors affect the main flow
    console.error('Error in request logging:', error);
  }
}

/**
 * Track frame transaction status
 */
export function logTransactionPreparation(
  network: string, 
  contract: string, 
  tokenId: string,
  context: Record<string, any> = {}
): void {
  console.log('===== FRAME TRANSACTION PREPARATION =====');
  console.log('- Network:', network);
  console.log('- Contract:', contract);
  console.log('- Token ID:', tokenId);
  
  if (Object.keys(context).length > 0) {
    console.log('- Details:', JSON.stringify(context, null, 2));
  }
  
  console.log('=========================================');
}
