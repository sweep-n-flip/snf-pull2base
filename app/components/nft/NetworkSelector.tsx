"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../Main";

// Definition of available networks (testnets only)
export interface Network {
  id: number;
  name: string;
  chainId: number;
  currency: string;
  rpcUrl: string;
  blockExplorerUrl: string;
  iconUrl?: string;
}

export const AVAILABLE_NETWORKS: Network[] = [
  {
    id: 1,
    name: "Sepolia",
    chainId: 11155111,
    currency: "ETH",
    rpcUrl: "https://rpc.sepolia.org",
    blockExplorerUrl: "https://sepolia.etherscan.io",
    iconUrl: "https://developers.moralis.com/wp-content/uploads/web3wiki/1147-sepolia/637aee14aa9d9f521437ec16_hYC2y965v3QD7fEoVvutzGbJzVGLSOk6RZPwEQWcA_E-300x300.jpeg"
  },
  // {
  //   id: 3,
  //   name: "Optimism Sepolia",
  //   chainId: 11155420,
  //   currency: "ETH",
  //   rpcUrl: "https://sepolia.optimism.io",
  //   blockExplorerUrl: "https://sepolia-optimism.etherscan.io",
  //   iconUrl: "https://optimism.io/images/op-logo.svg"
  // },
  // {
  //   id: 5,
  //   name: "Polygon Mumbai",
  //   chainId: 80001,
  //   currency: "MATIC",
  //   rpcUrl: "https://rpc-mumbai.maticvigil.com",
  //   blockExplorerUrl: "https://mumbai.polygonscan.com",
  //   iconUrl: "https://polygon.technology/images/polygon-logo.svg"
  // }
];

interface NetworkSelectorProps {
  selectedNetwork: Network | null;
  onSelectNetwork: (network: Network) => void;
}

export function NetworkSelector({ selectedNetwork, onSelectNetwork }: NetworkSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  // Ensures that Sepolia is selected by default when the component is mounted
  useEffect(() => {
    if (!selectedNetwork) {
      onSelectNetwork(AVAILABLE_NETWORKS[0]);
    }
  }, [selectedNetwork, onSelectNetwork]);

  // Closes the dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && 
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleSelectNetwork = (network: Network) => {
    onSelectNetwork(network);
    setIsOpen(false);
  };

  const filteredNetworks = AVAILABLE_NETWORKS.filter(network => 
    network.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-black">Select Chain</h3>
      </div>

      <div className="p-4">
        <div className="relative">
          {/* Current network selection button */}
          <div 
            ref={buttonRef}
            onClick={toggleDropdown}
            className="w-full cursor-pointer bg-white border border-gray-200 rounded-xl p-3 flex justify-between items-center"
          >
            <div className="flex gap-2 items-center justify-center">
              {selectedNetwork?.iconUrl ? (
                <img 
                  src={selectedNetwork.iconUrl} 
                  alt={selectedNetwork.name} 
                  className="w-6 h-6 mr-3 rounded-full" 
                />
              ) : (
                <div className="w-6 h-6 mr-3 bg-gray-200 rounded-full"></div>
              )}
              <span className="font-medium text-black">
                {selectedNetwork ? selectedNetwork.name : 'Arbitrum Sepolia'}
              </span>
            </div>
            <Icon name="chevron-down" className={`text-black transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
          </div>

          {/* Dropdown posicionado abaixo do seletor com a mesma largura */}
          {isOpen && (
            <div 
              ref={dropdownRef}
              className="absolut z-10 w-full bg-white rounded-xl shadow-xl border border-gray-200 "
            >
              {/* Campo de busca dentro do dropdown */}
              <div className="p-3 border-b border-gray-100">
                <input
                  type="text"
                  placeholder="Search networks"
                  className="w-full px-3 py-2 bg-gray-50 rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] text-black"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Networks header */}
              <div className="px-3 py-2 text-sm text-black font-medium">
                Available Networks
              </div>

              {/* Network list */}
              <div className="max-h-[300px] overflow-y-auto ">
                {filteredNetworks.map((network) => (
                    <button
                    key={network.id}
                    className={`w-full text-left p-3 flex items-center hover:bg-gray-50 gap-2 ${
                      selectedNetwork?.id === network.id ? 'bg-gray-50' : ''
                    }`}
                    onClick={() => handleSelectNetwork(network)}
                    >
                    {network.iconUrl && (
                      <img 
                      src={network.iconUrl} 
                      alt={network.name} 
                      className="w-8 h-8 mr-3 rounded-full" 
                      />
                    )}
                    <div>
                      <div className="font-medium text-sm text-black">{network.name}</div>
                      <div className="text-xs text-gray-500">{network.currency}</div>
                    </div>
                    {selectedNetwork?.id === network.id && (
                      <div className="ml-auto">
                        <div className="w-5 h-5 rounded-full bg-[var(--app-acce</div>nt)] flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 </div>24 24" fill="white" className="w-3 h-3">
                            <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 </svg>0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}