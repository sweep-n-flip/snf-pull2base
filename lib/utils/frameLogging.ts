/**
 * Utility for consistent logging of Farcaster Frame interactions
 */

import { NextRequest } from "next/server";

/**
 * Interface for structured frame request logging
 */
interface FrameLogData {
  requestPath: string;
  method: string;
  headers?: Record<string, string>;
  parameters?: Record<string, string>;
  frameData?: {
    state?: string;
    buttonIndex?: string;
    untrustedData?: any;
    trustedData?: any;
  };
  walletData?: {
    address?: string;
    fid?: string; 
    source?: string;
  };
  transactionData?: {
    chainId?: string;
    to?: string;
    value?: string;
    hash?: string;
  };
}

/**
 * Logs frame request details in a structured way
 * 
 * @param req NextRequest object
 * @param context Additional context for the log
 * @param data Optional structured data to log
 */
export function logFrameRequest(
  req: NextRequest,
  context: string,
  data?: Partial<FrameLogData>
) {
  const url = new URL(req.url);
  const logData: FrameLogData = {
    requestPath: url.pathname,
    method: req.method,
    ...data
  };

  // Collect headers if not already provided
  if (!logData.headers) {
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    logData.headers = headers;
  }

  // Collect URL parameters if not already provided
  if (!logData.parameters) {
    const parameters: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      parameters[key] = value;
    });
    logData.parameters = parameters;
  }

  // Log with structured format
  console.log(`[FRAME REQUEST] ${context}:`, JSON.stringify(logData, null, 2));
}

/**
 * Logs frame response details in a structured way
 * 
 * @param context Context description for the log
 * @param responseType Type of response (html, json, error)
 * @param data Response data or error details
 */
export function logFrameResponse(
  context: string,
  responseType: 'html' | 'json' | 'error',
  data: any
) {
  // For HTML responses, only log meta tags to avoid huge logs
  if (responseType === 'html' && typeof data === 'string') {
    // Extract meta tags related to frames
    const metaTags = data.match(/<meta property="fc:frame[^>]*>/g) || [];
    
    console.log(`[FRAME RESPONSE] ${context}:`, {
      type: responseType,
      frameMetaTags: metaTags,
      size: data.length
    });
    return;
  }

  // For JSON or errors, log the whole object
  console.log(`[FRAME RESPONSE] ${context}:`, {
    type: responseType,
    data
  });
}

/**
 * Logs transaction-related information
 * 
 * @param context Context description for the transaction
 * @param transactionData Transaction details
 */
export function logFrameTransaction(
  context: string,
  transactionData: {
    chainId?: string | number;
    to?: string;
    value?: string;
    data?: string;
    from?: string;
    hash?: string;
    status?: string;
    error?: string;
  }
) {
  // Avoid logging full transaction data which can be very large
  const safeTransactionData = {
    ...transactionData,
    data: transactionData.data 
      ? `${transactionData.data.substring(0, 30)}...` 
      : undefined
  };

  console.log(`[FRAME TRANSACTION] ${context}:`, safeTransactionData);
}