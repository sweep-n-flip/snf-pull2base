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
 * @returns void
 */
export function redirectToWarpcastAppIfNeeded(path?: string): void {
  if (typeof window === 'undefined') return;
  
  // Só redireciona se estiver em mobile E não estiver dentro do app
  if (isMobileDevice() && !isInMiniApp()) {
    // URLs para deep linking na Warpcast
    const warpcastAppUrl = path 
      ? `https://warpcast.com/${path}` 
      : 'https://warpcast.com/~/apps';
    
    // Abre app ou app store em dispositivos móveis
    window.location.href = warpcastAppUrl;
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

export default {
  isInMiniApp,
  isMobileDevice,
  formatFrameUrl,
  redirectToWarpcastAppIfNeeded,
  getConnectedWalletAddress
};
