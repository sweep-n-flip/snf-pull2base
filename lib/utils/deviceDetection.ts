/**
 * Utilitários para detectar o tipo de dispositivo e navegador
 */

/**
 * Verifica se o usuário está em um dispositivo móvel
 * @returns {boolean} true se for um dispositivo móvel
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Verifica através do user agent se é um dispositivo móvel
  const userAgent = window.navigator.userAgent.toLowerCase();
  
  return (
    /android|webos|iphone|ipad|ipod|blackberry|windows phone|opera mini|iemobile|mobile/i.test(userAgent)
  );
}

/**
 * Verifica se o usuário está no aplicativo Warpcast
 * @returns {boolean} true se estiver no aplicativo Warpcast
 */
export function isWarpcastApp(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  
  // Verifica se o user agent contém identificadores específicos do Warpcast
  return (
    userAgent.includes('warpcast') ||
    userAgent.includes('farcaster') ||
    document.referrer.includes('farcaster.xyz') ||
    document.referrer.includes('warpcast.com') ||
    // Também verifica se estamos em um webview dentro do Warpcast
    window.location.href.includes('warpcast') ||
    // Verifica headers específicos que o Warpcast pode enviar
    (typeof document !== 'undefined' && document.referrer.includes('miniapp'))
  );
}

/**
 * Detecta o sistema operacional do dispositivo
 * @returns {string} 'ios', 'android' ou 'other'
 */
export function getDeviceOS(): 'ios' | 'android' | 'other' {
  if (typeof window === 'undefined') return 'other';
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return 'ios';
  } else if (/android/i.test(userAgent)) {
    return 'android';
  }
  
  return 'other';
}
