// Service specifically for handling transactions via Reservoir API
import { MainnetNetwork } from './mainnetReservoir';

// Interface for Reservoir execution data
export interface ReservoirExecuteParams {
  orderId: string;
  quantity: number;
  taker: string;
  source?: string;
  referrer?: string;
}

export interface ReservoirExecuteResponse {
  steps: Array<{
    id: string;
    action: {
      type: 'transaction' | 'signature';
      data: {
        to: string;
        data: string;
        value: string;
        from?: string;
      }
    };
    description?: string;
    kind?: string;
    items?: Array<any>;
  }>;
}

/**
 * Fetches execution data for NFT purchase from Reservoir
 * 
 * @param network Network where the NFT is located (Ethereum, Base, etc)
 * @param params Parameters for order execution
 * @returns Formatted data for purchase execution
 */
export async function getReservoirExecuteData(
  network: MainnetNetwork,
  params: ReservoirExecuteParams
): Promise<{txUrl: string, step: any} | null> {
  try {
    // URL da API do Reservoir para execução
    const executeUrl = `${network.reservoirBaseUrl}/execute/v7`;
    const apiKey = process.env.NEXT_PUBLIC_RESERVOIR_API_KEY || 'demo-api-key';
    
    // Chamada à API do Reservoir
    const response = await fetch(executeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        items: [{
          orderId: params.orderId,
          quantity: params.quantity || 1
        }],
        taker: params.taker,
        source: params.source || 'pull2base',
        referrer: params.referrer
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get execution data: ${await response.text()}`);
    }
    
    const data = await response.json() as ReservoirExecuteResponse;
    
    if (!data.steps || data.steps.length === 0) {
      throw new Error('No execution steps returned');
    }
    
    // Por padrão, pegar o primeiro passo (geralmente há apenas um)
    const step = data.steps[0];
    
    if (!step.action || step.action.type !== 'transaction') {
      throw new Error('Invalid action type');
    }
    
    // Extrair dados da transação
    const txData = step.action.data;
    
    // Formatar URL para o frame Farcaster
    // ethereum:{contract-address}@{chain-id}/call?data={data}&value={value}
    // For Farcaster Frames, need to ensure the URL is properly formatted for the tx button
    const txUrl = `ethereum:${txData.to}@${network.chainId}/call?data=${encodeURIComponent(txData.data)}&value=${txData.value || 0}`;
    
    return {
      txUrl,
      step
    };
  } catch (error) {
    console.error('Error getting transaction data from Reservoir:', error);
    return null;
  }
}

/**
 * Tracks the status of a transaction after it was submitted
 * 
 * @param network Network where the transaction was submitted
 * @param txHash Transaction hash to track
 * @returns Status information about the transaction
 */
export async function trackReservoirTransaction(
  network: MainnetNetwork,
  txHash: string
): Promise<{
  success: boolean;
  status: 'pending' | 'completed' | 'failed';
  txHash: string;
  blockNumber?: number;
  message?: string;
}> {
  if (!txHash) {
    return {
      success: false,
      status: 'failed',
      txHash: '',
      message: 'No transaction hash provided'
    };
  }

  try {
    // Check transaction status using Reservoir API
    const statusUrl = `${network.reservoirBaseUrl}/transactions/v1/${txHash}`;
    const apiKey = process.env.NEXT_PUBLIC_RESERVOIR_API_KEY || 'demo-api-key';
    
    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'x-api-key': apiKey
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get transaction status: ${response.status}`);
    }
    
    const data = await response.json();
    const txData = data.transaction;
    
    if (!txData) {
      return {
        success: false,
        status: 'pending',
        txHash,
        message: 'Transaction not found yet'
      };
    }
    
    // Check transaction status
    if (txData.status === 'success') {
      return {
        success: true,
        status: 'completed',
        txHash,
        blockNumber: txData.blockNumber,
        message: 'Transaction completed successfully'
      };
    } else if (txData.status === 'failed') {
      return {
        success: false,
        status: 'failed',
        txHash,
        blockNumber: txData.blockNumber,
        message: txData.error || 'Transaction failed'
      };
    } else {
      return {
        success: false,
        status: 'pending',
        txHash,
        message: 'Transaction is still being processed'
      };
    }
  } catch (error) {
    console.error('Error tracking transaction:', error);
    return {
      success: false,
      status: 'pending',
      txHash,
      message: error instanceof Error ? error.message : 'Unknown error tracking transaction'
    };
  }
}
