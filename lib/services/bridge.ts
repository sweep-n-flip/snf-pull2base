// Configurações para a bridge entre Sepolia e Base
import { ethers } from 'ethers';

// Informações da bridge
export const BRIDGE_CONFIG = {
  // Endereço do contrato Bridge em Sepolia
  sepolia: {
    bridgeAddress: '0xC30863b499044CB164DA7f075A6c525DF6Eb55FA',
    lzAdapterAddress: '0xc135E79177982778C5296634fCD0F68c42728554',
    chainId: 11155111,
  },
  // Endereço do contrato Bridge em Base Sepolia
  base: {
    bridgeAddress: '0xC30863b499044CB164DA7f075A6c525DF6Eb55FA', 
    lzAdapterAddress: '0xc135E79177982778C5296634fCD0F68c42728554',
    chainId: 84532,
    lzEndpointId: 40330,
  }
};

// Carteira que fará as compras automaticamente
export const PURCHASE_WALLET = {
  address: process.env.NEXT_PUBLIC_PURCHASE_WALLET_ADDRESS || '',
  privateKey: process.env.PURCHASE_WALLET_PRIVATE_KEY || '',
};

// Função para estimar a taxa de bridge
export async function estimateBridgeFee(
  provider: ethers.Provider,
  nftContractAddress: string,
  tokenId: string
): Promise<bigint> {
  // Interface simplificada do contrato Bridge
  const bridgeAbi = [
    'function estimateFeeSendERC721UsingNative(uint256 evmChainId, address erc721Address, uint256[] memory tokenIds) external view returns (uint256)',
  ];
  
  const bridgeContract = new ethers.Contract(
    BRIDGE_CONFIG.sepolia.bridgeAddress,
    bridgeAbi,
    provider
  );

  try {
    const fee = await bridgeContract.estimateFeeSendERC721UsingNative(
      BRIDGE_CONFIG.base.chainId,
      nftContractAddress,
      [tokenId]
    );
    
    // Adicione um buffer de 10% para garantir que a transação não falhe
    return (fee * BigInt(110)) / BigInt(100);
  } catch (error) {
    console.error('Erro ao estimar taxa de bridge:', error);
    // Retornar um valor padrão em caso de erro (0.01 ETH)
    return ethers.parseEther('0.01');
  }
}

// Interface resumida do contrato Bridge
export const BRIDGE_ABI = [
  'function sendERC721UsingNative(uint256 evmChainId, address erc721Address, uint256[] memory tokenIds, address receiver) external payable',
  'function estimateFeeSendERC721UsingNative(uint256 evmChainId, address erc721Address, uint256[] memory tokenIds) external view returns (uint256)'
];
