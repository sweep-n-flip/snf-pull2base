// Integração com o Farcaster Frame SDK
// Fornece métodos para detectar ambiente, autenticação e recursos específicos de frames

/**
 * Verifica se o aplicativo está rodando dentro de um MiniApp do Farcaster/Warpcast
 * @returns {boolean} true se estiver rodando em um miniapp do Farcaster
 */
export function isInMiniApp(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    // Verifica se está no ambiente de miniapp
    return !!(window as any).frameElement || 
           !!(window as any).miniAppApi ||
           !!(window as any).miniapp ||
           !!(window as any).warpcastWindowApi ||
           window.location.href.includes('farcaster.xyz') ||
           window.location.href.includes('warpcast.com');
  } catch (e) {
    return false;
  }
}

/**
 * Verifica se a aplicação está rodando em um dispositivo móvel
 * @returns {boolean} true se for um dispositivo móvel
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    window.navigator.userAgent
  );
}

/**
 * Formata uma URL para uso com frames, considerando o ambiente
 * @param url A URL base para formatar
 * @returns A URL formatada considerando o ambiente
 */
export function formatFrameUrl(url: string): string {
  // Garantir que URLs para frames sempre usem HTTPS
  return url.replace('http://', 'https://');
}

/**
 * Redireciona para o App da Warpcast se estiver em mobile mas não no app
 * @param path Caminho opcional dentro do app
 * @param fallbackUrl URL de fallback se não conseguir abrir o app
 * @returns void
 */
export function redirectToWarpcastAppIfNeeded(path?: string, fallbackUrl?: string): void {
  if (typeof window === 'undefined') return;
  
  console.log('Checking redirection...', {
    isMobile: isMobileDevice(),
    isInMiniApp: isInMiniApp(),
    path,
    fallbackUrl,
    userAgent: window.navigator.userAgent
  });
  
  // Só redireciona se estiver em mobile E não estiver dentro do app
  if (isMobileDevice() && !isInMiniApp()) {
    // URLs para deep linking na Warpcast
    const warpcastAppUrl = path 
      ? `https://warpcast.com/${path}` 
      : 'https://warpcast.com/~/apps';
    
    console.log('Redirecting to Warpcast app:', warpcastAppUrl);
    
    // Tentar abrir o app primeiro
    try {
      window.location.href = warpcastAppUrl;
      
      // Se não conseguir abrir o app e houver uma URL de fallback, usar ela após um delay
      if (fallbackUrl) {
        setTimeout(() => {
          console.log('App opening may have failed, trying fallback:', fallbackUrl);
          window.location.href = fallbackUrl;
        }, 2000);
      }
    } catch (error) {
      console.error('Error opening Warpcast app:', error);
      if (fallbackUrl) {
        window.location.href = fallbackUrl;
      }
    }
  } else if (fallbackUrl && !isInMiniApp()) {
    // Se não for mobile mas houver fallback, usar o fallback
    console.log('Not mobile, using fallback URL:', fallbackUrl);
    window.location.href = fallbackUrl;
  }
}

/**
 * Obtém o endereço de uma wallet conectada através do frame
 * (implementação básica - pode precisar ser expandida conforme SDK oficial)
 */
export async function getConnectedWalletAddress(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  
  try {
    // Se o SDK do Frame ou MiniApp estiver disponível
    if ((window as any).frameElement && (window as any).frameElement.getWalletAddress) {
      return await (window as any).frameElement.getWalletAddress();
    }
    
    // Se a API da Warpcast estiver disponível
    if ((window as any).warpcastWindowApi && (window as any).warpcastWindowApi.getWalletAddress) {
      return await (window as any).warpcastWindowApi.getWalletAddress();
    }
    
    return null;
  } catch (e) {
    console.error('Erro ao obter endereço da wallet:', e);
    return null;
  }
}

/**
 * Formata dados de transação para o padrão do Farcaster Frame
 * @param txInfo Dados da transação
 * @param chainId ID da chain (número)
 * @returns Dados formatados para o Farcaster Frame
 */
export function formatFrameTransaction(
  txInfo: { to: string; data: string; value?: string },
  chainId: number
) {
  // Garantir que o valor está no formato correto (hexadecimal)
  let value = txInfo.value || '0';
  if (value && !value.startsWith('0x')) {
    if (!isNaN(Number(value))) {
      value = '0x' + Number(value).toString(16);
    } else {
      value = '0x0';
    }
  }

  // Formatação correta para Frames Farcaster
  return {
    chainId: `eip155:${chainId}`, // Prefixo eip155: é necessário
    method: 'eth_sendTransaction',
    params: {
      // Não incluir campo "from", o frame substituirá automaticamente
      to: txInfo.to,
      data: txInfo.data,
      value: value
    }
  };
}

/**
 * Define URLs for Farcaster wallet resources to handle CORS properly
 */
export const FARCASTER_WALLET_RESOURCES = {
  WALLET_RESOURCE_URL: 'https://client.warpcast.com/v2/wallet/resource',
  TRANSACTION_SERVICE: 'https://wallet.farcaster.xyz/api/transaction',
  WALLET_AUTH: 'https://client.warpcast.com/v2/authenticateWithWallet',
  WARPCAST_APP: 'https://warpcast.com'
};

/**
 * Helper function to create a proxy fetch that works with Farcaster wallet
 * Solves CORS issues by using your own server as a proxy
 * @param url Wallet resource URL to fetch
 * @param options Fetch options
 */
export async function proxyFarcasterWalletFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  // If we're on the server, we're already bypassing CORS
  if (typeof window === 'undefined') {
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        'Accept': 'application/json'
      }
    });
  }

  // On client, use your proxy endpoint instead
  // You'll need to create a proxy API route in your Next.js app
  const proxyUrl = '/api/wallet-proxy';
  
  return fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url,
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body
    })
  });
}

export default {
  isInMiniApp,
  isMobileDevice,
  formatFrameUrl,
  redirectToWarpcastAppIfNeeded,
  getConnectedWalletAddress,
  formatFrameTransaction,
  FARCASTER_WALLET_RESOURCES,
  proxyFarcasterWalletFetch
};
