/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence warnings
  // https://github.com/WalletConnect/walletconnect-monorepo/issues/1908
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
  env: {
    NEXT_PUBLIC_PURCHASE_WALLET_ADDRESS: process.env.NEXT_PUBLIC_PURCHASE_WALLET_ADDRESS,
    NEXT_PUBLIC_SEPOLIA_RPC_URL: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
    NEXT_PUBLIC_ONCHAINKIT_API_KEY: process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY,
    NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || 'Pull2Base',
    NEXT_PUBLIC_RESERVOIR_API_KEY: process.env.NEXT_PUBLIC_RESERVOIR_API_KEY,
  },
};

export default nextConfig;
