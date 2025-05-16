// Serviço para compra automatizada de NFTs
import { ethers } from 'ethers';
import { PURCHASE_WALLET } from './bridge';

// Interface básica para ERC721
const ERC721_ABI = [
  'function approve(address to, uint256 tokenId) external',
  'function transferFrom(address from, address to, uint256 tokenId) external',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function isApprovedForAll(address owner, address operator) external view returns (bool)',
  'function setApprovalForAll(address operator, bool approved) external'
];

// Interface básica para Marketplace (Reservoir)
const RESERVOIR_MARKETPLACE_ABI = [
  'function execute(address[2] calldata tokenTransfers, uint256[3] calldata amountTransfers, bytes calldata data) external payable returns (bool)'
];

// Endereço do marketplace (Reservoir) em Sepolia
const RESERVOIR_MARKETPLACE_ADDRESS = '0x9a32ad74f9dce887a3edaf5a10d66021c20736a9';

/**
 * Compra um NFT na rede Sepolia
 * @param nftAddress Endereço do contrato NFT
 * @param tokenId ID do token a ser comprado
 * @param listingPrice Preço da listagem em ETH
 * @param buyData Dados para a execução da compra
 */
export async function purchaseNFT(
  nftAddress: string,
  tokenId: string,
  listingPrice: string,
  buyData: string
): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  try {
    // Verificar se as variáveis de ambiente estão configuradas
    if (!PURCHASE_WALLET.privateKey || !PURCHASE_WALLET.address) {
      throw new Error('Carteira de compra não configurada. Verifique as variáveis de ambiente.');
    }

    // Configurar o provedor RPC e carteira
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org');
    const wallet = new ethers.Wallet(PURCHASE_WALLET.privateKey, provider);

    // Criar instância do contrato do marketplace
    const marketplace = new ethers.Contract(
      RESERVOIR_MARKETPLACE_ADDRESS,
      RESERVOIR_MARKETPLACE_ABI,
      wallet
    );

    // Verifica o saldo da carteira antes da compra
    const balance = await provider.getBalance(wallet.address);
    const price = ethers.parseEther(listingPrice);

    if (balance < price) {
      throw new Error(`Saldo insuficiente na carteira de compra. Necessário: ${listingPrice} ETH`);
    }

    // Executar a transação de compra
    const tx = await marketplace.execute(
      [nftAddress, wallet.address], // tokenTransfers
      [tokenId, 0, price], // amountTransfers
      buyData, // dados da compra
      { value: price } // enviando o valor da compra
    );

    // Aguardar a confirmação da transação
    const receipt = await tx.wait();

    return {
      success: true,
      transactionHash: receipt.hash,
    };
  } catch (error) {
    console.error('Erro ao comprar NFT:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao comprar NFT',
    };
  }
}

/**
 * Verifica se o NFT já foi comprado pela carteira configurada
 * @param nftAddress Endereço do contrato NFT
 * @param tokenId ID do token
 */
export async function isNFTOwned(
  nftAddress: string,
  tokenId: string
): Promise<boolean> {
  try {
    // Provedor RPC
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org');
    
    // Contrato NFT
    const nftContract = new ethers.Contract(nftAddress, ERC721_ABI, provider);
    
    // Verificar o proprietário do NFT
    const owner = await nftContract.ownerOf(tokenId);
    
    // Verificar se o proprietário é a carteira de compra
    return owner.toLowerCase() === PURCHASE_WALLET.address.toLowerCase();
  } catch (error) {
    console.error('Erro ao verificar propriedade do NFT:', error);
    return false;
  }
}

/**
 * Aprova o contrato Bridge para transferir o NFT
 * @param nftAddress Endereço do contrato NFT
 * @param tokenId ID do token
 * @param bridgeAddress Endereço do contrato Bridge
 */
export async function approveNFTForBridge(
  nftAddress: string,
  tokenId: string,
  bridgeAddress: string
): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  try {
    // Configurar o provedor RPC e carteira
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org');
    const wallet = new ethers.Wallet(PURCHASE_WALLET.privateKey, provider);

    // Criar instância do contrato NFT
    const nftContract = new ethers.Contract(nftAddress, ERC721_ABI, wallet);

    // Verificar se já está aprovado
    const isApproved = await nftContract.isApprovedForAll(wallet.address, bridgeAddress);
    
    if (isApproved) {
      return { success: true };
    }

    // Aprovar o contrato Bridge para todos os tokens (mais eficiente que aprovar um por um)
    const tx = await nftContract.setApprovalForAll(bridgeAddress, true);
    
    // Aguardar a confirmação da transação
    const receipt = await tx.wait();

    return {
      success: true,
      transactionHash: receipt.hash,
    };
  } catch (error) {
    console.error('Erro ao aprovar NFT para bridge:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao aprovar NFT',
    };
  }
}
