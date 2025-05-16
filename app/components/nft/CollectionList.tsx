"use client";

import { getCollectionsByNetwork } from "@/lib/services/reservoir";
import { useEffect, useState } from "react";
import { Network } from "./NetworkSelector";

export interface NFTCollection {
  id: string;
  name: string;
  symbol: string;
  image?: string;
  description?: string;
  contractAddress: string;
  tokenCount?: string;
  floorPrice?: {
    amount: number;
    currency: string;
  };
}

interface CollectionListProps {
  selectedNetwork: Network | null;
  onSelectCollection: (collection: NFTCollection) => void;
  selectedCollection: NFTCollection | null;
}

export function CollectionList({ 
  selectedNetwork, 
  onSelectCollection,
  selectedCollection 
}: CollectionListProps) {
  const [collections, setCollections] = useState<NFTCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!selectedNetwork) {
      setCollections([]);
      return;
    }

    setLoading(true);
    setError(null);

    // Busca coleções da API Reservoir
    async function fetchCollections() {
      try {
        const reservoirCollections = await getCollectionsByNetwork(selectedNetwork as Network, 10);
        
        // Mapeia as coleções para o formato da interface NFTCollection
        const formattedCollections: NFTCollection[] = reservoirCollections.map(collection => ({
          id: collection.id,
          name: collection.name,
          symbol: collection.symbol || '',
          image: collection.image,
          description: collection.description,
          contractAddress: collection.contractAddress,
          tokenCount: collection.tokenCount,
          floorPrice: collection.floorAskPrice ? {
            amount: collection.floorAskPrice.amount.native,
            currency: collection.floorAskPrice.currency.symbol
          } : undefined
        }));
        
        setCollections(formattedCollections);
        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar coleções:', err);
        setError('Erro ao carregar coleções');
        setLoading(false);
      }
    }

    fetchCollections();
  }, [selectedNetwork]);

  // When a collection is selected, set collapsed to true
  useEffect(() => {
    if (selectedCollection) {
      setCollapsed(true);
    } else {
      setCollapsed(false);
    }
  }, [selectedCollection]);
  
  const handleCollectionClick = (collection: NFTCollection) => {
    if (selectedCollection?.id === collection.id) {
      // If clicking on already selected collection, deselect it and expand the list
      onSelectCollection(null as any);
      setCollapsed(false);
    } else {
      // Otherwise, select the collection and collapse the list
      onSelectCollection(collection);
      setCollapsed(true);
    }
  };

  if (!selectedNetwork) {
    return (
      <div className="text-center p-8 text-black">
        Selecione uma rede para ver as coleções disponíveis
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--app-accent)] mx-auto"></div>
        <p className="mt-2 text-black">Carregando coleções...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-500">
        {error}
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="text-center p-8 text-black">
        Nenhuma coleção encontrada nesta rede
      </div>
    );
  }

  // Display just the selected collection when collapsed
  if (collapsed && selectedCollection) {
    return (
      <div className="mt-6">
        <div className="mb-4">
          <h2 className="text-lg font-medium text-black">Selected Collection</h2>
        </div>
        
        <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 p-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-black">
            <div className="col-span-1">#</div>
            <div className="col-span-5">Collection</div>
            <div className="col-span-2 text-right">Floor</div>
            <div className="col-span-2 text-right">Items</div>
            <div className="col-span-2 text-right">Action</div>
          </div>
          
          {/* Selected Collection */}
          <div 
            key={selectedCollection.id}
            onClick={() => handleCollectionClick(selectedCollection)}
            className="grid grid-cols-12 gap-2 p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer bg-[var(--app-orange-light)]"
          >
            <div className="col-span-1 flex items-center text-black">
              1
            </div>
            <div className="col-span-5 flex items-center space-x-3">
              {selectedCollection.image ? (
                <img 
                  src={selectedCollection.image} 
                  alt={selectedCollection.name} 
                  className="w-10 h-10 rounded-full" 
                />
              ) : (
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              )}
              <div>
                <div className="font-medium text-sm text-black">{selectedCollection.name}</div>
                <div className="text-xs text-black">{selectedCollection.symbol}</div>
              </div>
            </div>
            <div className="col-span-2 text-right flex items-center justify-end">
              {selectedCollection.floorPrice ? (
                <div className="text-sm text-black">
                  {selectedCollection.floorPrice.amount.toFixed(3)} 
                  <span className="text-black text-xs ml-1">{selectedCollection.floorPrice.currency}</span>
                </div>
              ) : (
                <span className="text-xs text-black">-</span>
              )}
            </div>
            <div className="col-span-2 text-right flex items-center justify-end text-sm text-black">
              {selectedCollection.tokenCount ? parseInt(selectedCollection.tokenCount).toLocaleString() : '-'}
            </div>
            <div className="col-span-2 text-right flex items-center justify-end">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-[var(--app-accent)]">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show all collections when expanded
  return (
    <div className="mt-6">
      <div className="mb-4">
        <h2 className="text-lg font-medium text-black">Coleção Específica - Sepolia</h2>
      </div>
      
      <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
        {/* Table header */}
        <div className="grid grid-cols-12 gap-2 p-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-black">
          <div className="col-span-1">#</div>
          <div className="col-span-5">Collection</div>
          <div className="col-span-2 text-right">Floor</div>
          <div className="col-span-2 text-right">Items</div>
          <div className="col-span-2 text-right">Action</div>
        </div>
        
        {/* Collections */}
        {collections.map((collection, index) => (
          <div 
            key={collection.id}
            onClick={() => handleCollectionClick(collection)}
            className={`grid grid-cols-12 gap-2 p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
              selectedCollection?.id === collection.id ? 'bg-[var(--app-orange-light)]' : ''
            }`}
          >
            <div className="col-span-1 flex items-center text-black">
              {index + 1}
            </div>
            <div className="col-span-5 flex items-center space-x-3">
              {collection.image ? (
                <img 
                  src={collection.image} 
                  alt={collection.name} 
                  className="w-10 h-10 rounded-full" 
                />
              ) : (
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              )}
              <div>
                <div className="font-medium text-sm text-black">{collection.name}</div>
                <div className="text-xs text-black">{collection.symbol}</div>
              </div>
            </div>
            <div className="col-span-2 text-right flex items-center justify-end">
              {collection.floorPrice ? (
                <div className="text-sm text-black">
                  {collection.floorPrice.amount.toFixed(3)} 
                  <span className="text-black text-xs ml-1">{collection.floorPrice.currency}</span>
                </div>
              ) : (
                <span className="text-xs text-black">-</span>
              )}
            </div>
            <div className="col-span-2 text-right flex items-center justify-end text-sm text-black">
              {collection.tokenCount ? parseInt(collection.tokenCount).toLocaleString() : '-'}
            </div>
            <div className="col-span-2 text-right flex items-center justify-end">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-[var(--app-accent)]">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}