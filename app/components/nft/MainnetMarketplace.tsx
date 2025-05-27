"use client";

import {
  buyNFTWithReferrer,
  generateCollectionShareUrl,
  generateCollectionWarpcastShareUrl,
  generateWarpcastShareUrl,
  getCheapestNFTFromCollection,
  getMainnetNFTBuyData,
  getMainnetNFTsByCollection,
  getTrendingCollections,
  MAINNET_NETWORKS,
  NFTBuyAction,
  ReservoirCollection,
  ReservoirNFT,
  searchCollections
} from "@/lib/services/mainnetReservoir";
import { isMobileDevice, isWarpcastApp } from "@/lib/utils/deviceDetection";
import { ConnectWallet } from "@coinbase/onchainkit/wallet";
import { adaptViemWallet, Execute } from "@reservoir0x/reservoir-sdk";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { Button, Card } from "../Main";

export function MainnetMarketplace() {
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const searchParams = useSearchParams();
  
  const [selectedNetwork, setSelectedNetwork] = useState(MAINNET_NETWORKS[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [collections, setCollections] = useState<ReservoirCollection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<ReservoirCollection | null>(null);
  const [nfts, setNfts] = useState<ReservoirNFT[]>([]);
  const [filteredNFTs, setFilteredNFTs] = useState<ReservoirNFT[]>([]);
  const [selectedNFT, setSelectedNFT] = useState<ReservoirNFT | null>(null);
  const [buyData, setBuyData] = useState<NFTBuyAction | null>(null);
  
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(false);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);
  const [isLoadingBuyData, setIsLoadingBuyData] = useState(false);
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State to track transaction steps
  const [transactionSteps, setTransactionSteps] = useState<Execute['steps']>([]);
  const [transactionHash, setTransactionHash] = useState<string | undefined>();

  // Referrer and royalty states
  const [referrerAddress, setReferrerAddress] = useState<string | null>(null);
  const [royaltyBps, setRoyaltyBps] = useState<number>(250); // Default 2.5%
  const [showRoyaltyModal, setShowRoyaltyModal] = useState(false);
  const [customRoyalty, setCustomRoyalty] = useState('');
  const [collectionToShare, setCollectionToShare] = useState<ReservoirCollection | null>(null);

  // Function to search collections based on search term
  const handleSearch = useCallback(async () => {
    if (!searchTerm) return;
    
    setIsSearching(true);
    setError(null);
    
    try {
      const results = await searchCollections(selectedNetwork, searchTerm);
      setCollections(results);
      setSelectedCollection(null);
      setNfts([]);
      setSelectedNFT(null);
    } catch (err) {
      console.error("Search error:", err);
      setError("Failed to search collections. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }, [searchTerm, selectedNetwork]);

  // Function to load NFTs from a collection
  const loadNFTs = useCallback(async (collection: ReservoirCollection) => {
    setIsLoadingNFTs(true);
    setError(null);
    
    try {
      const nftResults = await getMainnetNFTsByCollection(selectedNetwork, collection.id);
      setNfts(nftResults);
      setSelectedNFT(null);
    } catch (err) {
      console.error("Error loading NFTs:", err);
      setError("Failed to load NFTs from collection. Please try again.");
    } finally {
      setIsLoadingNFTs(false);
    }
  }, [selectedNetwork]);

  // Function to select a collection
  const handleSelectCollection = useCallback((collection: ReservoirCollection) => {
    setSelectedCollection(collection);
    loadNFTs(collection);
  }, [loadNFTs]);

  // Function to select an NFT and fetch its purchase data
  const handleSelectNFT = useCallback(async (nft: ReservoirNFT) => {
    setSelectedNFT(nft);
    setIsLoadingBuyData(true);
    setError(null);
    
    try {
      const buyActionData = await getMainnetNFTBuyData(
        selectedNetwork, 
        nft.token.contract,
        nft.token.tokenId
      );
      
      setBuyData(buyActionData);
    } catch (err) {
      console.error("Error loading purchase data:", err);
      setError("Failed to load purchase data. Please try again.");
    } finally {
      setIsLoadingBuyData(false);
    }
  }, [selectedNetwork]);

  // Function to load a specific NFT from URL parameters
  const loadSpecificNFT = useCallback(async (networkId: string, contract: string, tokenId: string) => {
    try {
      setIsLoadingBuyData(true);
      setError(null);

      // Find the network
      const network = MAINNET_NETWORKS.find(n => n.id.toString() === networkId);
      if (!network) {
        throw new Error(`Network with ID ${networkId} not found`);
      }

      // Set the network if it's different from current
      if (network.id !== selectedNetwork.id) {
        setSelectedNetwork(network);
      }

      // Fetch the specific NFT data
      const apiUrl = `${network.reservoirBaseUrl}/tokens/v7?tokens=${contract}:${tokenId}&includeAttributes=true&includeTopBid=true&includeLastSale=true&includeMarketData=true`;
      const apiKey = process.env.NEXT_PUBLIC_RESERVOIR_API_KEY || 'demo-api-key';

      const response = await fetch(apiUrl, {
        headers: {
          'accept': 'application/json',
          'x-api-key': apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Error fetching NFT data: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.tokens || data.tokens.length === 0) {
        throw new Error('NFT not found');
      }

      const nftData = data.tokens[0];
      
      // Convert to ReservoirNFT format
      const reservoirNFT: ReservoirNFT = {
        token: {
          tokenId: nftData.token?.tokenId || tokenId,
          name: nftData.token?.name,
          description: nftData.token?.description,
          image: nftData.token?.image,
          media: nftData.token?.media,
          attributes: nftData.token?.attributes,
          owner: nftData.token?.owner,
          collection: {
            id: nftData.token?.collection?.id || '',
            name: nftData.token?.collection?.name || ''
          },
          contract: nftData.token?.contract || contract,
          isFlagged: nftData.token?.isFlagged || false,
          lastSale: nftData.token?.lastSale
        },
        market: nftData.market
      };

      // Auto-select this NFT
      await handleSelectNFT(reservoirNFT);

    } catch (err) {
      console.error("Error loading specific NFT:", err);
      setError(err instanceof Error ? err.message : "Failed to load specific NFT");
    } finally {
      setIsLoadingBuyData(false);
    }
  }, [selectedNetwork, handleSelectNFT]);

  // Function to buy NFT directly via Reservoir API
  const [isBuying, setIsBuying] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState<{
    success?: boolean;
    message?: string;
    txHash?: string;
    steps?: any[];
  } | null>(null);

  const handleBuyNFT = useCallback(async () => {
    if (!selectedNetwork || !selectedNFT || !walletClient) {
      setError("Please connect your wallet to continue");
      return;
    }
    
    setIsProcessingPurchase(true);
    setError(null);
    
    try {
      // Create the wallet adapter for Reservoir SDK
      const wallet = adaptViemWallet(walletClient);
      
      // Get the buyer address from wallet - must await as it returns a Promise
      const buyerAddress = await wallet.address();
      
      // Use buyNFTWithReferrer if referrer is present, otherwise use the standard function
      const result = referrerAddress && royaltyBps > 0
        ? await buyNFTWithReferrer(
            selectedNetwork,
            selectedNFT.token.contract,
            selectedNFT.token.tokenId,
            buyerAddress,
            referrerAddress,
            royaltyBps
          )
        : await import('@/lib/services/mainnetReservoir').then(mod => 
            mod.buyNFTDirectly(
              selectedNetwork,
              selectedNFT.token.contract,
              selectedNFT.token.tokenId,
              buyerAddress,
              wallet // Pass the wallet adapter
            )
          );
      
      if (result.success) {
        setTransactionSteps(result.steps || []);
        setTransactionHash(result.txHash);
        setPurchaseStatus({
          success: true,
          message: referrerAddress 
            ? `Purchase successful! Referrer ${referrerAddress} will earn ${(royaltyBps / 100).toFixed(1)}%`
            : 'Purchase successful!',
          txHash: result.txHash,
          steps: result.steps
        });
      } else {
        setError(result.error || "Failed to purchase NFT");
        setPurchaseStatus({
          success: false,
          message: result.error || "Failed to purchase NFT"
        });
      }
    } catch (err) {
      console.error("Error during purchase:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred during purchase";
      setError(errorMessage);
      setPurchaseStatus({
        success: false,
        message: errorMessage
      });
    } finally {
      setIsProcessingPurchase(false);
    }
  }, [selectedNetwork, selectedNFT, walletClient, referrerAddress, royaltyBps]);
  
  // Function to load trending collections
  const loadTrendingCollections = useCallback(async () => {
    setIsLoadingTrending(true);
    setError(null);
    
    try {
      const trendingResults = await getTrendingCollections(selectedNetwork);
      setCollections(trendingResults);
    } catch (err) {
      console.error("Error loading trending collections:", err);
      setError("Failed to load trending collections. Please try again.");
    } finally {
      setIsLoadingTrending(false);
    }
  }, [selectedNetwork]);
  
  // Filter only NFTs that are for sale
  useEffect(() => {
    if (nfts && nfts.length > 0) {
      const forSaleNFTs = nfts.filter(nft => 
        nft.market?.floorAsk?.price && 
        nft.market.floorAsk.price.amount && 
        nft.market.floorAsk.price.amount.native > 0
      );
      setFilteredNFTs(forSaleNFTs);
    } else {
      setFilteredNFTs([]);
    }
  }, [nfts]);

  // Load trending collections when component initializes or network changes
  useEffect(() => {
    loadTrendingCollections();
  }, [loadTrendingCollections]);

  // Auto-load specific NFT from URL parameters
  useEffect(() => {
    const networkParam = searchParams.get('network');
    const contractParam = searchParams.get('contract');
    const tokenIdParam = searchParams.get('tokenId');
    const autoSelectParam = searchParams.get('autoSelect');
    const referrerParam = searchParams.get('referrer');
    const royaltyParam = searchParams.get('royalty');

    // Set referrer and royalty from URL params
    if (referrerParam) {
      setReferrerAddress(referrerParam);
    }
    if (royaltyParam) {
      const royalty = parseInt(royaltyParam);
      if (royalty >= 10 && royalty <= 1000) { // 0.1% to 10%
        setRoyaltyBps(royalty);
      }
    }

    // Only auto-load if all required parameters are present and autoSelect is true
    if (networkParam && contractParam && tokenIdParam && autoSelectParam === 'true') {
      console.log('Auto-loading NFT from URL params:', { networkParam, contractParam, tokenIdParam, referrerParam, royaltyParam });
      loadSpecificNFT(networkParam, contractParam, tokenIdParam);
    }
  }, [searchParams, loadSpecificNFT]);

  // Effect to automatically search when search term has more than 3 characters
  useEffect(() => {
    if (searchTerm.length >= 3) {
      const timeoutId = setTimeout(() => {
        handleSearch();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, handleSearch]);
  
  // Function to handle collection sharing
  const handleShareCollection = useCallback(async (collection: ReservoirCollection) => {
    if (!address) {
      setError("Please connect your wallet to share collections");
      return;
    }

    try {
      // Find cheapest NFT in collection
      const cheapestResult = await getCheapestNFTFromCollection(selectedNetwork, collection.contractAddress);
      
      if (!cheapestResult.success || !cheapestResult.nft) {
        setError("No available NFTs found in this collection");
        return;
      }

      // Set the collection to share and show the royalty modal
      setCollectionToShare(collection);
      setShowRoyaltyModal(true);

    } catch (err) {
      console.error("Error sharing collection:", err);
      setError("Failed to generate share link. Please try again.");
    }
  }, [selectedNetwork, address]);

  const handleRoyaltySelection = useCallback((bps: number) => {
    setRoyaltyBps(bps);
    setCustomRoyalty('');
  }, []);

  // Function to handle cast action
  const handleCastCollection = useCallback(() => {
    if (!collectionToShare || !address) return;

    try {
      const url = generateCollectionWarpcastShareUrl(
        selectedNetwork,
        collectionToShare.contractAddress,
        collectionToShare.name,
        address,
        royaltyBps,
        window.location.origin
      );
      
      console.log("Opening Collection Cast with Warpcast URL:", url);
      
      // Detectar se estamos no Warpcast ou dispositivo móvel (identical to NFT Cast)
      const isInWarpcast = isWarpcastApp();
      const isMobile = isMobileDevice();
      
      if (isInWarpcast) {
        // No Warpcast, usar window.location.href para manter no miniapp
        window.location.href = url;
      } else if (isMobile) {
        // Em dispositivo móvel mas fora do Warpcast, tentar abrir no app se possível
        // Usar intent do Warpcast para tentar abrir no app
        const frameUrl = `${window.location.origin}/api/frames/collection?network=${selectedNetwork.id}&contract=${collectionToShare.contractAddress}&referrer=${address}&royalty=${royaltyBps}`;
        const shareText = `Check out this collection: ${collectionToShare.name}`;
        const warpcastIntentUrl = `warpcast://compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(frameUrl)}`;
        
        // Tentar abrir no app primeiro, se falhar usar a web
        const appOpened = window.open(warpcastIntentUrl, '_self');
        
        // Fallback para versão web após um pequeno delay
        setTimeout(() => {
          if (!appOpened || appOpened.closed) {
            window.location.href = url;
          }
        }, 1000);
      } else {
        // No desktop, abrir em nova aba
        window.open(url, '_blank', 'noopener,noreferrer');
      }

      // Close modal and clear the collection after sharing
      setShowRoyaltyModal(false);
      setCollectionToShare(null);
    } catch (err) {
      console.error("Error sharing collection:", err);
      setError("Failed to share collection. Please try again.");
    }
  }, [collectionToShare, selectedNetwork, address, royaltyBps]);

  // Function to handle custom royalty input
  const handleCustomRoyalty = useCallback(() => {
    const customBps = Math.round(parseFloat(customRoyalty) * 100);
    if (customBps >= 10 && customBps <= 1000) { // 0.1% to 10%
      handleRoyaltySelection(customBps);
    } else {
      setError('Royalty must be between 0.1% and 10%');
    }
  }, [customRoyalty, handleRoyaltySelection]);

  // Function to handle NFT sharing (updated for collections)
  const handleShareNFT = useCallback(async (nft: ReservoirNFT) => {
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      
      // Generate collection share URL instead of individual NFT
      const shareUrl = generateCollectionShareUrl(
        selectedNetwork,
        nft.token.contract,
        address,
        royaltyBps,
        baseUrl
      );

      const warpcastUrl = generateCollectionWarpcastShareUrl(
        selectedNetwork,
        nft.token.contract,
        nft.token.collection.name,
        address,
        royaltyBps,
        baseUrl
      );

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }

      if (isMobileDevice() || isWarpcastApp()) {
        window.open(warpcastUrl, '_blank');
      } else {
        // Desktop: open in new tab
        window.open(warpcastUrl, '_blank', 'noopener,noreferrer');
      }

    } catch (err) {
      console.error("Error sharing NFT:", err);
      setError("Failed to generate share link. Please try again.");
    }
  }, [selectedNetwork, address, royaltyBps]);

  return (
    <div className="py-3">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          {/* Network Selection */}
          <div className="flex justify-center space-x-2 mb-6">
            {MAINNET_NETWORKS.map(network => (
              <Button
                key={network.id}
                variant={selectedNetwork.id === network.id ? "primary" : "outline"}
                onClick={() => setSelectedNetwork(network)}
                className="px-4 py-2 flex items-center space-x-2"
              >
                <span>{network.name}</span>
              </Button>
            ))}
          </div>

          {/* Search Field */}
          <div className="mx-auto max-w-2xl">
            <div className="flex items-center mb-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search collections (e.g., Pudgy Penguins, Azuki, Art Blocks...)"
                className="w-full border border-gray-300 rounded-l px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]"
              />
              <Button 
                variant="primary"
                onClick={handleSearch}
                className="rounded-l-none"
                disabled={!searchTerm || isSearching}
              >
                {isSearching ? (
                  <div className="flex items-center">
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                    <span>Searching...</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span>Search</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">❌ {error}</p>
          </div>
        )}

        {/* Search Results or Trending Collections */}
        {!selectedCollection && (
          <div className="mb-8 center-align">
            <h2 className="text-xl font-semibold mb-4">
              {searchTerm.length > 0 ? "Collections Found" : "Featured Collections"}
            </h2>
            
            {isLoadingTrending && collections.length === 0 ? (
              <div className="py-12 flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--app-accent)] mx-auto"></div>
              </div>
            ) : collections.length > 0 ? (
              <div className="nft-grid">
                {collections.map(collection => (
                  <Card 
                    key={collection.id}
                    className="p-3 hover:shadow-md transition-shadow max-w-[300px] mx-auto w-full"
                  >
                    <div className="flex flex-col">
                      <div 
                        className="aspect-square w-full rounded-md overflow-hidden mb-2 cursor-pointer"
                        onClick={() => handleSelectCollection(collection)}
                      >
                        {collection.image ? (
                          <img 
                            src={collection.image} 
                            alt={collection.name} 
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=No+Image';
                            }}
                          />
                        ) : (
                          <div className="h-full w-full bg-gray-200 flex items-center justify-center text-gray-400">
                            No Image
                          </div>
                        )}
                      </div>
                      <div className="mb-2">
                        <h3 className="text-sm font-medium text-black truncate">{collection.name}</h3>
                        <p className="text-xs text-gray-500 truncate">
                          {collection.tokenCount ? `${collection.tokenCount} items` : 'No data'}
                        </p>
                        {collection.floorAskPrice && (
                          <p className="text-xs text-black">
                            <span className="font-medium">Floor:</span> {collection.floorAskPrice.amount.native} {collection.floorAskPrice.currency.symbol}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 mt-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShareCollection(collection)}
                          className="flex-1 text-xs w-28 flex items-center justify-center gap-2 bg-[#6944BA] hover:bg-[#0052FF]/90 text-white border-none py-3"
                        >
                          <img 
                            src="/warpcast.png" 
                            alt="Warpcast" 
                            className="h-4 w-4" 
                          />
                          <span className="font-semibold text-white">Cast</span>
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">
                No collections found.
              </p>
            )}
          </div>
        )}

        {/* Selected Collection and NFTs */}
        {selectedCollection && (
          <div>
            {/* Collection Information */}
            <div className="mb-6 flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSelectedCollection(null);
                  setNfts([]);
                }}
                className="flex items-center"
              >
                Back
              </Button>
              
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12  rounded-full overflow-hidden">
                  {selectedCollection.image ? (
                    <img 
                      src={selectedCollection.image} 
                      alt={selectedCollection.name} 
                      className="h-full w-full object-cover" 
                    />
                  ) : (
                    <div className="h-full w-full bg-gray-200"></div>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-black">{selectedCollection.name}</h2>
                  {selectedCollection.floorAskPrice && (
                    <p className="text-sm text-black">
                      Floor: {selectedCollection.floorAskPrice.amount.native} {selectedCollection.floorAskPrice.currency.symbol}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Loading NFTs */}
            {isLoadingNFTs && (
              <div className="py-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--app-accent)] mx-auto mb-4"></div>
                <p className="text-gray-700">Loading NFTs for sale...</p>
              </div>
            )}

            {/* NFTs Grid */}
            {!isLoadingNFTs && (
              <>
                {filteredNFTs.length > 0 ? (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">{filteredNFTs.length} NFTs for sale</h3>
                      {nfts.length !== filteredNFTs.length && (
                        <p className="text-xs text-gray-500">
                          Showing only {filteredNFTs.length} of {nfts.length} NFTs that are for sale
                        </p>
                      )}
                    </div>
                    
                    <div className="nft-grid mb-10">
                      {filteredNFTs.map(nft => (
                        <Card
                          key={`${nft.token.contract}-${nft.token.tokenId}`}
                          className={`overflow-hidden cursor-pointer max-w-[300px] mx-auto w-full ${
                            selectedNFT?.token.tokenId === nft.token.tokenId ? 'ring-2 ring-[var(--app-accent)]' : ''
                          }`}
                          onClick={() => handleSelectNFT(nft)}
                        >
                          <div className="aspect-square w-full overflow-hidden bg-gray-100 relative">
                            <img
                              src={nft.token.image || nft.token.media || 'https://placehold.co/400x400?text=No+Image'}
                              alt={nft.token.name || `Token #${nft.token.tokenId}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=No+Image';
                              }}
                            />
                            
                            {nft.market?.floorAsk?.price && (
                              <div className="absolute bottom-0 right-0 bg-black bg-opacity-70 text-white px-2 py-1 m-1 rounded text-xs">
                                {nft.market.floorAsk.price.amount?.native} {nft.market.floorAsk.price.currency?.symbol || 'ETH'}
                              </div>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-xs font-medium truncate text-black">
                              {nft.token.name || `#${nft.token.tokenId}`}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              ID: {nft.token.tokenId}
                            </p>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-gray-700">
                      {nfts.length > 0 
                        ? "There are no NFTs for sale in this collection at the moment." 
                        : "No NFTs found in this collection."
                      }
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* NFT Details Modal */}
        {selectedNFT && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl w-[95vw] max-w-2xl overflow-hidden flex flex-col mx-4 my-4">
              <div className="p-3 sm:p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-black truncate">
                  {selectedNFT.token.name || `#${selectedNFT.token.tokenId}`}
                </h3>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNFT(null);
                    setBuyData(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 flex-shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-3 sm:p-4 overflow-y-auto">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-1/2">
                    <div className="aspect-square max-h-[200px] sm:max-h-[280px] w-auto rounded-xl overflow-hidden border border-gray-200 mx-auto">
                      <img
                        src={selectedNFT.token.image || selectedNFT.token.media || 'https://placehold.co/400x400?text=No+Image'}
                        alt={selectedNFT.token.name || `Token #${selectedNFT.token.tokenId}`}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=No+Image';
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-full sm:w-1/2">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Details</h4>
                      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Token ID</span>
                          <span className="text-sm font-medium text-black">{selectedNFT.token.tokenId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Contract</span>
                          <span className="text-sm font-medium truncate max-w-[180px] text-black">{selectedNFT.token.contract}</span>
                        </div>
                        
                        {selectedNFT.token.lastSale && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Last Sale</span>
                            <span className="text-sm font-medium text-black">
                              {selectedNFT.token.lastSale.price.amount.native} {selectedNFT.token.lastSale.price.currency.symbol}
                            </span>
                          </div>
                        )}
                        
                        {selectedNFT.market?.floorAsk?.price && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Current Price</span>
                            <span className="text-sm font-medium text-[var(--app-accent)]">
                              {selectedNFT.market.floorAsk.price.amount?.native} {selectedNFT.market.floorAsk.price.currency?.symbol || 'ETH'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Attributes, if available */}
                    {selectedNFT.token.attributes && selectedNFT.token.attributes.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Attributes</h4>
                        <div className="bg-gray-50 rounded-lg p-2 grid grid-cols-2 gap-2">
                          {selectedNFT.token.attributes.slice(0, 6).map((attr, index) => (
                            <div key={index} className="bg-white rounded p-2 text-center">
                              <p className="text-xs text-gray-500 truncate">{attr.key}</p>
                              <p className="text-sm font-medium truncate">{attr.value}</p>
                            </div>
                          ))}
                        </div>
                        {selectedNFT.token.attributes.length > 6 && (
                          <p className="text-xs text-gray-500 mt-1 text-center">
                            +{selectedNFT.token.attributes.length - 6} more attributes
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Purchase Section */}
                <div className="mt-4">
                  {isLoadingBuyData ? (
                    <div className="text-center p-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--app-accent)] mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">Checking availability...</p>
                    </div>
                  ) : buyData ? (
                    <Card className="p-4">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <p className="text-sm text-gray-700">Price:</p>
                          <p className="text-xl font-bold text-[var(--app-accent)]">
                            {buyData.price} {buyData.currency}
                          </p>
                        </div>
                        {!isConnected ? (
                          <ConnectWallet className="bg-[#FF2E00] hover:bg-[#FF2E00]/80">
                            Connect Wallet
                          </ConnectWallet>
                        ) : (
                          <Button 
                            variant="primary" 
                            size="md"
                            onClick={handleBuyNFT}
                            disabled={isBuying}
                          >
                            {isBuying ? 'Processing...' : 'Buy Now'}
                          </Button>
                        )}
                      </div>
                      {purchaseStatus && (
                        <div className={`mt-2 p-2 rounded ${purchaseStatus.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                          <p className={`text-sm ${purchaseStatus.success ? 'text-green-700' : 'text-red-700'}`}>
                            {purchaseStatus.message}
                          </p>
                          {purchaseStatus.txHash && (
                            <a 
                              href={`${selectedNetwork.blockExplorerUrl}/tx/${purchaseStatus.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs underline text-blue-600 hover:text-blue-800"
                            >
                              View transaction
                            </a>
                          )}
                          
                          {purchaseStatus.steps && purchaseStatus.steps.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-gray-700">Transaction steps:</p>
                              <ul className="mt-1 text-xs space-y-1">
                                {purchaseStatus.steps.map((step, i) => (
                                  <li key={i} className="flex items-center">
                                    <span className={`w-4 h-4 mr-2 rounded-full flex items-center justify-center text-[10px] ${
                                      step.status === 'complete' ? 'bg-green-100 text-green-800' : 
                                      step.status === 'incomplete' ? 'bg-yellow-100 text-yellow-800' : 
                                      'bg-blue-100 text-blue-800'
                                    }`}>
                                      {step.status === 'complete' ? '✓' : i + 1}
                                    </span>
                                    <span>{step.action || `Step ${i + 1}`}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-gray-500">
                        By clicking "Buy Now", you will initiate a direct purchase transaction through your connected wallet.
                      </p>
                    </Card>
                  ) : (
                    <Card className="p-4 bg-gray-50">
                      <p className="text-center text-gray-700">This NFT is not currently for sale.</p>
                    </Card>
                  )}
                </div>

                {/* Share to Warpcast */}
                {/* Share to Warpcast Frame */}
                <div className="mt-4 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-28 flex items-center justify-center gap-2 bg-[#6944BA] hover:bg-[#0052FF]/90 text-white border-none py-3"
                    onClick={async () => {
                      if (!selectedNFT) return;
                      
                      try {
                        const url = generateWarpcastShareUrl(
                          selectedNetwork,
                          selectedNFT,
                          window.location.origin
                        );
                        
                        // Simplificamos a lógica de compartilhamento para usar a URL do warpcast diretamente
                        // Em qualquer caso, redirecionamos para a URL do warpcast, que funcionará em desktop e mobile
                        console.log("Opening Warpcast share URL:", url);
                        
                        // Detectar se estamos no Warpcast ou dispositivo móvel
                        const isInWarpcast = isWarpcastApp();
                        const isMobile = isMobileDevice();
                        
                        if (isInWarpcast) {
                          // No Warpcast, usar window.location.href para manter no miniapp
                          window.location.href = url;
                        } else if (isMobile) {
                          // Em dispositivo móvel mas fora do Warpcast, tentar abrir no app se possível
                          // Usar intent do Warpcast para tentar abrir no app
                          const warpcastIntentUrl = `warpcast://compose?text=${encodeURIComponent(`Check out this NFT: ${selectedNFT.token.name || `#${selectedNFT.token.tokenId}`}`)}&embeds[]=${encodeURIComponent(`${window.location.origin}/api/frames/nft?network=${selectedNetwork.id}&contract=${selectedNFT.token.contract}&tokenId=${selectedNFT.token.tokenId}`)}`;
                          
                          // Tentar abrir no app primeiro, se falhar usar a web
                          const appOpened = window.open(warpcastIntentUrl, '_self');
                          
                          // Fallback para versão web após um pequeno delay
                          setTimeout(() => {
                            if (!appOpened || appOpened.closed) {
                              window.location.href = url;
                            }
                          }, 1000);
                        } else {
                          // No desktop, abrir em nova aba
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }
                        } catch (err) {
                        console.error("Error generating share URL:", err);
                        alert("Failed to share to Warpcast. Please try again.");
                      }
                    }}
                  >
                    <img 
                      src="/warpcast.png" 
                      alt="Base" 
                      className="h-5 w-5" 
                    />
                    <span className="font-semibold text-white">Cast</span>
                  </Button>
                  <p className="text-xs text-center text-gray-500 mt-2">
                    Share this NFT as a framed post on Warpcast
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cast & Earn Modal */}
        {showRoyaltyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md p-6">
              <h3 className="text-lg font-medium text-black mb-4">
                Cast & Earn
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Choose your earning rate. You'll earn this percentage from every purchase made through your cast.
              </p>
              
              {/* Current Selection Display */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-700">
                  Current rate: <span className="font-semibold text-[var(--app-accent)]">{(royaltyBps / 100).toFixed(1)}%</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  You'll earn {(royaltyBps / 100).toFixed(1)}% of each sale price
                </p>
              </div>
              
              {/* Preset Royalty Options */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[100, 250, 500, 750].map(bps => (
                  <Button
                    key={bps}
                    variant={royaltyBps === bps ? "primary" : "outline"}
                    onClick={() => handleRoyaltySelection(bps)}
                    className="px-4 py-2 text-sm"
                  >
                    {(bps / 100).toFixed(1)}%
                  </Button>
                ))}
              </div>
              
              {/* Custom Royalty Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Rate (0.1% - 10%)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={customRoyalty}
                    onChange={(e) => setCustomRoyalty(e.target.value)}
                    placeholder="e.g., 3.5"
                    min="0.1"
                    max="10"
                    step="0.1"
                    className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]"
                  />
                  <Button
                    variant="outline"
                    onClick={handleCustomRoyalty}
                    disabled={!customRoyalty}
                    className="text-sm"
                  >
                    Apply
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowRoyaltyModal(false)}
                  className="text-sm"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCastCollection}
                  className="w-28 flex items-center justify-center gap-2 bg-[#6944BA] hover:bg-[#0052FF]/90 text-white border-none py-3"
                >
                  Cast
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Referrer Earnings Display */}
        {referrerAddress && (
          <div className="fixed bottom-4 right-4 bg-green-100 border border-green-200 rounded-lg p-3 max-w-sm z-40">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-800">Referrer Active</span>
            </div>
            <p className="text-xs text-green-700 mt-1">
              Referrer {referrerAddress.slice(0, 6)}...{referrerAddress.slice(-4)} will earn {(royaltyBps / 100).toFixed(1)}% from your purchase
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
