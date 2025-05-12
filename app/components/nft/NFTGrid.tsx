"use client";

import { getNFTsByCollection } from "@/lib/services/reservoir";
import { useEffect, useState } from "react";
import { NFTCollection } from "./CollectionList";
import { Network } from "./NetworkSelector";

export interface NFT {
  id: string;
  name: string;
  description?: string;
  image: string;
  tokenId: string;
  owner?: string;
  contract: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

interface NFTGridProps {
  selectedCollection: NFTCollection | null;
  selectedNetwork: Network | null;
}

// Tipo para opções de ordenação
type SortOption = {
  label: string;
  value: 'tokenId_asc' | 'tokenId_desc' | 'name_asc' | 'name_desc';
}

// Tipo para filtros de atributos
type AttributeFilter = {
  traitType: string;
  values: string[];
  selectedValues: string[];
}

export function NFTGrid({ selectedCollection, selectedNetwork }: NFTGridProps) {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [filteredNfts, setFilteredNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  
  // Estados para filtros e ordenação
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [attributeFilters, setAttributeFilters] = useState<AttributeFilter[]>([]);
  const [currentSort, setCurrentSort] = useState<SortOption>({ label: 'ID (Menor para Maior)', value: 'tokenId_asc' });

  // Opções de ordenação
  const sortOptions: SortOption[] = [
    { label: 'ID (Menor para Maior)', value: 'tokenId_asc' },
    { label: 'ID (Maior para Menor)', value: 'tokenId_desc' },
    { label: 'Nome (A-Z)', value: 'name_asc' },
    { label: 'Nome (Z-A)', value: 'name_desc' },
  ];

  useEffect(() => {
    if (!selectedCollection || !selectedNetwork) {
      setNfts([]);
      setFilteredNfts([]);
      setSelectedNFT(null);
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedNFT(null);

    // Busca NFTs da coleção na API Reservoir
    async function fetchNFTs() {
      try {
        const reservoirNFTs = await getNFTsByCollection(
          selectedNetwork as Network,
          selectedCollection!.id,
          20
        );
        
        // Mapeia os NFTs da Reservoir para o formato da interface NFT
        const formattedNFTs: NFT[] = reservoirNFTs.map(item => {
          const token = item.token;
          
          return {
            id: `${token.contract}-${token.tokenId}`,
            name: token.name || `#${token.tokenId}`,
            description: token.description,
            image: token.image || token.media || 'https://placehold.co/400x400?text=No+Image',
            tokenId: token.tokenId,
            owner: token.owner,
            contract: token.contract,
            attributes: token.attributes?.map(attr => ({
              trait_type: attr.key,
              value: attr.value
            }))
          };
        });
        
        setNfts(formattedNFTs);
        setFilteredNfts(formattedNFTs);
        
        // Extrai todos os atributos únicos para construir os filtros
        extractAttributeFilters(formattedNFTs);
        
        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar NFTs:', err);
        setError('Erro ao carregar NFTs');
        setLoading(false);
      }
    }

    fetchNFTs();
  }, [selectedCollection, selectedNetwork]);

  // Função para extrair todos os atributos únicos das NFTs
  const extractAttributeFilters = (nftList: NFT[]) => {
    const traitTypes: Record<string, Set<string>> = {};
    
    nftList.forEach(nft => {
      if (nft.attributes) {
        nft.attributes.forEach(attr => {
          if (!traitTypes[attr.trait_type]) {
            traitTypes[attr.trait_type] = new Set();
          }
          traitTypes[attr.trait_type].add(String(attr.value));
        });
      }
    });
    
    const filters: AttributeFilter[] = Object.entries(traitTypes).map(([traitType, valueSet]) => ({
      traitType,
      values: Array.from(valueSet),
      selectedValues: []
    }));
    
    setAttributeFilters(filters);
  };

  // Função para aplicar filtros e ordenação
  const applyFiltersAndSort = () => {
    let result = [...nfts];
    
    // Aplica os filtros de atributos se existirem seleções
    const activeFilters = attributeFilters.filter(filter => filter.selectedValues.length > 0);
    
    if (activeFilters.length > 0) {
      result = result.filter(nft => 
        activeFilters.every(filter => {
          // Se a NFT não tiver este atributo, não passa no filtro
          if (!nft.attributes) return false;
          
          const matchingAttribute = nft.attributes.find(attr => attr.trait_type === filter.traitType);
          if (!matchingAttribute) return false;
          
          // Verifica se o valor do atributo está entre os selecionados
          return filter.selectedValues.includes(String(matchingAttribute.value));
        })
      );
    }
    
    // Aplica a ordenação
    result.sort((a, b) => {
      switch (currentSort.value) {
        case 'tokenId_asc':
          return parseInt(a.tokenId) - parseInt(b.tokenId);
        case 'tokenId_desc':
          return parseInt(b.tokenId) - parseInt(a.tokenId);
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });
    
    setFilteredNfts(result);
  };

  // Aplica filtros e ordenação sempre que os filtros ou ordenação mudarem
  useEffect(() => {
    if (nfts.length > 0) {
      applyFiltersAndSort();
    }
  }, [attributeFilters, currentSort, nfts]);

  // Função para atualizar um filtro específico
  const updateFilter = (traitType: string, value: string, isChecked: boolean) => {
    setAttributeFilters(prev => 
      prev.map(filter => {
        if (filter.traitType === traitType) {
          if (isChecked) {
            return {
              ...filter,
              selectedValues: [...filter.selectedValues, value]
            };
          } else {
            return {
              ...filter,
              selectedValues: filter.selectedValues.filter(v => v !== value)
            };
          }
        }
        return filter;
      })
    );
  };

  // Função para limpar todos os filtros
  const clearFilters = () => {
    setAttributeFilters(prev => 
      prev.map(filter => ({
        ...filter,
        selectedValues: []
      }))
    );
  };

  if (!selectedCollection) {
    return null;
  }

  if (loading) {
    return (
      <div className="text-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--app-accent)] mx-auto"></div>
        <p className="mt-2 text-black">Carregando NFTs...</p>
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

  if (nfts.length === 0) {
    return (
      <div className="text-center p-8 text-black">
        Nenhuma NFT encontrada nesta coleção
      </div>
    );
  }

  return (
    <div className="pb-16 relative">
      <div className="mb-4 mt-4 flex justify-between items-center">
        
        <div className="flex space-x-3">
        <h2 className="text-lg font-medium text-black">
          {selectedCollection.name}
        </h2>
          <div className="relative">
            <button 
              className="text-sm px-3 py-1.5 bg-[#FF2E00] border border-gray-200 rounded-lg flex items-center"
              onClick={() => {
                setShowFilterMenu(!showFilterMenu);
                setShowSortMenu(false);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
              </svg>
              Filtrar
              {attributeFilters.some(f => f.selectedValues.length > 0) && (
                <span className="ml-1 bg-white text-[#FF2E00] rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold">
                  {attributeFilters.reduce((acc, filter) => acc + filter.selectedValues.length, 0)}
                </span>
              )}
            </button>
            
            {showFilterMenu && (
              <div className="absolute z-10 mt-2 w-72 bg-white rounded-md shadow-lg p-4 max-h-[70vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-black">Filters</h4>
                  <button 
                    className="text-xs text-gray-500 hover:text-black"
                    onClick={clearFilters}
                  >
                    Limpar filtros
                  </button>
                </div>
                
                {attributeFilters.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhum atributo disponível para filtrar</p>
                ) : (
                  <div className="space-y-4">
                    {attributeFilters.map((filter, idx) => (
                      <div key={idx} className="border-t pt-3">
                        <h5 className="font-medium text-sm text-black mb-2">{filter.traitType}</h5>
                        <div className="space-y-1">
                          {filter.values.map((value, vidx) => (
                            <div key={vidx} className="flex items-center">
                              <input
                                type="checkbox"
                                id={`${filter.traitType}-${vidx}`}
                                checked={filter.selectedValues.includes(value)}
                                onChange={(e) => updateFilter(filter.traitType, value, e.target.checked)}
                                className="h-4 w-4 text-[#FF2E00] rounded border-gray-300 focus:ring-[#FF2E00]"
                              />
                              <label htmlFor={`${filter.traitType}-${vidx}`} className="ml-2 text-sm text-black">{value}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-4 flex justify-end">
                  <button 
                    className="bg-[#FF2E00] text-white px-3 py-1.5 rounded-lg text-sm"
                    onClick={() => setShowFilterMenu(false)}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="relative">
            <button 
              className="text-sm px-3 py-1.5 bg-[#FF2E00] border border-gray-200 rounded-lg flex items-center"
              onClick={() => {
                setShowSortMenu(!showSortMenu);
                setShowFilterMenu(false);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
              </svg>
              Ordenar
            </button>
            
            {showSortMenu && (
              <div className="absolute z-10 mt-2 w-48 bg-white rounded-md shadow-lg overflow-hidden">
                {sortOptions.map((option, idx) => (
                  <div 
                    key={idx}
                    className={`px-4 py-2 text-black text-sm cursor-pointer hover:bg-gray-100 ${currentSort.value === option.value ? 'bg-gray-100' : ''}`}
                    onClick={() => {
                      setCurrentSort(option);
                      setShowSortMenu(false);
                    }}
                  >
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Contador de resultados */}
        <div className="text-sm text-gray-500">
          {filteredNfts.length} resultados
        </div>
      </div>
      
      {/* Fechar menus ao clicar fora deles */}
      {(showFilterMenu || showSortMenu) && (
        <div 
          className="fixed inset-0 z-5"
          onClick={() => {
            setShowFilterMenu(false);
            setShowSortMenu(false);
          }}
        />
      )}
      
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredNfts.map((nft) => (
          <div
            key={nft.id}
            onClick={() => setSelectedNFT(nft)}
            className={`bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer transform transition-all hover:shadow-md ${
              selectedNFT?.id === nft.id ? 'ring-2 ring-[var(--app-accent)] shadow-md' : ''
            }`}
          >
            <div className="aspect-square w-full overflow-hidden bg-gray-100">
              <img
                src={nft.image}
                alt={nft.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=No+Image';
                }}
              />
            </div>
            <div className="p-3">
              <p className="text-sm font-medium truncate text-black">{nft.name}</p>
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-black">Token ID: {nft.tokenId}</p>
                <div className="bg-[var(--app-orange-light)] text-[var(--app-accent)] text-xs px-2 py-0.5 rounded">
                  View
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedNFT && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-[95vw] h-[85vh] overflow-hidden flex flex-col mx-4 my-4">
            <div className="p-3 sm:p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-black truncate">{selectedNFT.name}</h3>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNFT(null);
                }}
                className="text-gray-500 hover:text-gray-700 flex-shrink-0 ml-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-3 sm:p-4 overflow-y-auto flex-grow">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/3">
                  <div className="aspect-square max-h-[200px] sm:max-h-[280px] w-auto rounded-xl overflow-hidden border border-gray-200 mx-auto">
                    <img
                      src={selectedNFT.image}
                      alt={selectedNFT.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=No+Image';
                      }}
                    />
                  </div>
                </div>
                <div className="w-full md:w-2/3">
                  {selectedNFT.description && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Descrição</h4>
                      <p className="text-sm text-black max-h-16 overflow-y-auto">{selectedNFT.description}</p>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Detalhes</h4>
                      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Token ID</span>
                          <span className="text-sm font-medium text-black">{selectedNFT.tokenId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Contrato</span>
                          <span className="text-sm font-medium truncate max-w-[180px] text-black">{selectedNFT.contract}</span>
                        </div>
                        {selectedNFT.owner && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Dono</span>
                            <span className="text-sm font-medium truncate max-w-[180px] text-black">{selectedNFT.owner}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedNFT.attributes && selectedNFT.attributes.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Atributos</h4>
                        <div className="grid grid-cols-2 gap-2 max-h-20 overflow-y-auto pr-1">
                          {selectedNFT.attributes.map((attr, idx) => (
                            <div 
                              key={idx} 
                              className="bg-[var(--app-orange-light)] rounded-lg p-2"
                            >
                              <p className="text-xs text-gray-500 truncate">{attr.trait_type}</p>
                              <p className="text-sm font-medium text-[var(--app-accent)] truncate">{attr.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 flex justify-end mt-auto">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNFT(null);
                }}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium mr-2"
              >
                Fechar
              </button>
              <button 
                className="bg-[var(--app-accent)] text-white px-4 py-2 rounded-lg text-sm font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(
                    `${selectedNetwork?.blockExplorerUrl}/token/${selectedNFT.contract}?a=${selectedNFT.tokenId}`,
                    '_blank'
                  );
                }}
              >
                Ver no Explorer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}