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
    
    // Verificar e usar a chave API específica para a rede se disponível
    const networkApiKey = network.chainId === 1 
      ? process.env.NEXT_PUBLIC_RESERVOIR_ETH_API_KEY 
      : network.chainId === 8453 
        ? process.env.NEXT_PUBLIC_RESERVOIR_BASE_API_KEY
        : null;
    
    const apiKey = networkApiKey || process.env.NEXT_PUBLIC_RESERVOIR_API_KEY || 'demo-api-key';
    
    console.log(`Usando API endpoint para ${network.name} (chainId: ${network.chainId}): ${executeUrl}`);
    
    const requestBody = {
      items: [{
        orderId: params.orderId,
        quantity: params.quantity || 1
      }],
      taker: params.taker,
      source: params.source || 'pull2base',
      referrer: params.referrer
    };

    console.log('Reservoir execute request:', {
      url: executeUrl,
      network: network.name,
      chainId: network.chainId,
      body: requestBody,
      apiKey: apiKey ? (apiKey.substring(0, 3) + '...' + apiKey.substring(apiKey.length - 3)) : 'none'
    });
    
    // Verificar se temos uma chave de API válida
    if (!apiKey || apiKey === 'demo-api-key') {
      console.warn('⚠️ Usando chave de API de demonstração ou nenhuma chave. Isso pode limitar funcionalidades.');
    }
    
    // Chamada à API do Reservoir com timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos de timeout
    
    const response = await fetch(executeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    
    // Limpar o timeout
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Reservoir API error:', { 
        status: response.status, 
        statusText: response.statusText,
        error: errorText,
        url: executeUrl,
        body: requestBody
      });
      throw new Error(`Failed to get execution data: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json() as ReservoirExecuteResponse;
    
    console.log('Reservoir response:', {
      hasSteps: !!data.steps,
      stepCount: data.steps?.length || 0,
      firstStepType: data.steps?.[0]?.action?.type
    });
    
    if (!data.steps || data.steps.length === 0) {
      throw new Error('No execution steps returned');
    }
    
    // Por padrão, pegar o primeiro passo (geralmente há apenas um)
    const step = data.steps[0];
    
    if (!step.action || step.action.type !== 'transaction') {
      console.error('Invalid step data:', { 
        hasAction: !!step.action, 
        actionType: step.action?.type,
        step: JSON.stringify(step, null, 2)
      });
      throw new Error(`Invalid action type: expected 'transaction', got '${step.action?.type}'`);
    }
    
    // Extrair dados da transação
    const txData = step.action.data;
    
    if (!txData.to || !txData.data) {
      console.error('Invalid transaction data:', txData);
      throw new Error('Transaction data missing required fields (to, data)');
    }

    // Garantir que o valor está no formato correto (hexadecimal)
    let value = txData.value || '0';
    if (value && !value.startsWith('0x')) {
      // Se não for hex, converter o valor numérico para hex
      if (!isNaN(Number(value))) {
        value = '0x' + Number(value).toString(16);
      } else {
        value = '0x0';
      }
    }
    
    // Formatar URL para o frame Farcaster 
    // O formato correto é: ethereum:{contract-address}@{chain-id}/call?data={data}&value={value}
    // Onde chain-id precisa incluir o prefixo eip155:
    const txUrl = `ethereum:${txData.to}@eip155:${network.chainId}/call?data=${txData.data}&value=${value}`;
    
    // Log formatted transaction URL and see if we're using special placeholders
    const placeholder = params.taker && (params.taker.includes('${') || params.taker.includes('fid:'));
    console.log('Transaction URL formatted:', {
      txUrl,
      to: txData.to,
      chainId: `eip155:${network.chainId}`,
      value: value,
      originalValue: txData.value,
      fromAddress: txData.from,
      takerAddress: params.taker,
      placeholder,
    });
    
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
