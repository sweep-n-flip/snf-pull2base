"use client";

import { BRIDGE_ABI, BRIDGE_CONFIG, estimateBridgeFee } from "@/lib/services/bridge";
import { isNFTOwned, purchaseNFT } from "@/lib/services/purchase";
import { getNFTSaleData } from "@/lib/services/reservoir";
import { ethers } from "ethers";
import { useCallback, useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { Button, Card } from "../Main";
import { Network } from "./NetworkSelector";
import { NFT } from "./NFTGrid";

export interface BridgeState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
  txHash: string | null;
  estimatedFee: string | null;
}

interface NFTBridgeProps {
  nft: NFT;
  network: Network;
  onBridgeComplete: () => void;
}

export function NFTBridge({ nft, network, onBridgeComplete }: NFTBridgeProps) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  
  const [bridgeState, setBridgeState] = useState<BridgeState>({
    isLoading: false,
    error: null,
    success: false,
    txHash: null,
    estimatedFee: null,
  });

  const [purchaseState, setPurchaseState] = useState({
    isPurchasing: false,
    isPurchased: false,
    error: null as string | null,
    txHash: null as string | null,
  });

  const estimateFee = useCallback(async () => {
    if (!walletClient) return;
    
    setBridgeState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const provider = new ethers.BrowserProvider(walletClient.transport);
      const fee = await estimateBridgeFee(provider, nft.contract, nft.tokenId);
      
      setBridgeState(prev => ({ 
        ...prev, 
        estimatedFee: ethers.formatEther(fee),
        isLoading: false 
      }));
    } catch (error) {
      console.error('Erro ao estimar taxa:', error);
      setBridgeState(prev => ({ 
        ...prev, 
        error: 'Falha ao estimar taxa de transferência',
        isLoading: false 
      }));
    }
  }, [walletClient, nft]);

  const startBridgeProcess = useCallback(async () => {
    if (!walletClient || !address) return;
    
    setBridgeState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // 1. Verificar se o NFT está à venda na Sepolia e buscar dados da venda
      const saleData = await getNFTSaleData(network, nft.contract, nft.tokenId);
      
      if (!saleData) {
        setBridgeState(prev => ({
          ...prev,
          isLoading: false,
          error: 'NFT não está à venda atualmente'
        }));
        return;
      }

      // 2. Verificar se o NFT já foi comprado pela carteira de compra
      const isOwned = await isNFTOwned(nft.contract, nft.tokenId);

      if (!isOwned) {
        // 3. Se não foi comprado, fazer a compra automática
        setPurchaseState(prev => ({ ...prev, isPurchasing: true }));
        
        const purchaseResult = await purchaseNFT(
          nft.contract,
          nft.tokenId,
          saleData.price,
          saleData.buyData
        );
        
        if (!purchaseResult.success) {
          setPurchaseState({
            isPurchasing: false,
            isPurchased: false,
            error: purchaseResult.error || 'Falha na compra da NFT',
            txHash: null
          });
          
          setBridgeState(prev => ({
            ...prev,
            isLoading: false,
            error: 'A compra da NFT falhou. Por favor, tente novamente.'
          }));
          return;
        }

        setPurchaseState({
          isPurchasing: false,
          isPurchased: true,
          error: null,
          txHash: purchaseResult.transactionHash || null
        });
      }

      // 4. Estimar a taxa de bridge
      const provider = new ethers.BrowserProvider(walletClient.transport);
      const fee = await estimateBridgeFee(provider, nft.contract, nft.tokenId);
      
      setBridgeState(prev => ({ 
        ...prev, 
        estimatedFee: ethers.formatEther(fee),
        isLoading: false 
      }));

    } catch (error) {
      console.error('Erro no processo de bridge:', error);
      setBridgeState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        isLoading: false 
      }));
    }
  }, [walletClient, address, nft, network]);

  const executeBridge = useCallback(async () => {
    if (!walletClient || !address || !bridgeState.estimatedFee) return;
    
    setBridgeState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Criar interface do contrato Bridge
      const provider = new ethers.BrowserProvider(walletClient.transport);
      const signer = await provider.getSigner();
      
      const bridgeContract = new ethers.Contract(
        BRIDGE_CONFIG.sepolia.bridgeAddress,
        BRIDGE_ABI,
        signer
      );

      // Executar a transação de bridge
      const tx = await bridgeContract.sendERC721UsingNative(
        BRIDGE_CONFIG.base.chainId,
        nft.contract,
        [nft.tokenId],
        address,
        { value: ethers.parseEther(bridgeState.estimatedFee) }
      );

      // Aguardar a confirmação da transação
      const receipt = await tx.wait();

      setBridgeState({
        isLoading: false,
        error: null,
        success: true,
        txHash: receipt.hash,
        estimatedFee: bridgeState.estimatedFee
      });

      // Notificar que o bridge foi concluído
      onBridgeComplete();

    } catch (error) {
      console.error('Erro ao executar bridge:', error);
      setBridgeState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Erro desconhecido na transação de bridge',
        isLoading: false,
        success: false
      }));
    }
  }, [walletClient, address, nft, bridgeState.estimatedFee, onBridgeComplete]);

  // Renderização condicional com base nos estados
  return (
    <Card className="p-4">
      <h3 className="text-lg font-medium mb-4">Bridge NFT para Base</h3>

      {purchaseState.isPurchased && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-700 text-sm">
            ✅ NFT comprada automaticamente com sucesso!
          </p>
          {purchaseState.txHash && (
            <a 
              href={`${network.blockExplorerUrl}/tx/${purchaseState.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline mt-1 block"
            >
              Ver transação de compra
            </a>
          )}
        </div>
      )}

      {purchaseState.isPurchasing && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center">
            <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-yellow-700"></div>
            <p className="text-yellow-700 text-sm">
              Comprando NFT automaticamente...
            </p>
          </div>
        </div>
      )}

      {purchaseState.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">
            ❌ Erro na compra: {purchaseState.error}
          </p>
        </div>
      )}

      {bridgeState.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">❌ {bridgeState.error}</p>
        </div>
      )}

      {bridgeState.success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">            <p className="text-green-700 text-sm">
            ✅ Bridge iniciado com sucesso! Você receberá seu NFT na rede Base Sepolia em breve (geralmente leva 10-15 minutos).
          </p>
          {bridgeState.txHash && (
            <a 
              href={`${network.blockExplorerUrl}/tx/${bridgeState.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline mt-1 block"
            >
              Ver transação de bridge
            </a>
          )}
        </div>
      )}

      <div className="mt-4">
        {!bridgeState.estimatedFee && !bridgeState.success && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
              <p className="text-sm text-blue-700 mb-2">
                <strong>Como funciona:</strong>
              </p>
              <ol className="list-decimal pl-5 text-sm text-blue-700">
                <li>Ao clicar no botão abaixo, o sistema comprará automaticamente este NFT para você</li>
                <li>Em seguida, você precisará confirmar a transação de bridge com sua carteira</li>
                <li>O NFT será transferido para sua carteira na rede Base Sepolia em alguns minutos</li>
              </ol>
            </div>
            
            <Button
              variant="primary"
              onClick={startBridgeProcess}
              disabled={bridgeState.isLoading || !walletClient}
              className="w-full"
            >
              {bridgeState.isLoading ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin mr-2 h-4 w-4 border-b-2 border-white"></span>
                  Processando...
                </span>
              ) : (
                "Iniciar Bridge para Base"
              )}
            </Button>
          </>
        )}

        {bridgeState.estimatedFee && !bridgeState.success && (
          <>
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
              <p className="text-sm text-gray-700 mb-1">Taxa estimada para bridge:</p>
              <p className="text-lg font-medium text-black">{bridgeState.estimatedFee} ETH</p>
            </div>
            
            <Button
              variant="primary"
              onClick={executeBridge}
              disabled={bridgeState.isLoading || !walletClient}
              className="w-full"
            >
              {bridgeState.isLoading ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin mr-2 h-4 w-4 border-b-2 border-white"></span>
                  Processando Bridge...
                </span>
              ) : (
                "Confirmar e Iniciar Bridge"
              )}
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
