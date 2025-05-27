"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "../Main";
import { CollectionList, type NFTCollection } from "./CollectionList";
import { MainnetMarketplace } from "./MainnetMarketplace";
import { NFTGrid } from "./NFTGrid";
import { AVAILABLE_NETWORKS, type Network } from "./NetworkSelector";

type Tab = "bridge" | "marketplace";

export function NFTTabsNavigation() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>("bridge");
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(AVAILABLE_NETWORKS[0]);
  const [selectedCollection, setSelectedCollection] = useState<NFTCollection | null>(null);

  // Read URL parameters to set initial tab state
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'marketplace') {
      setActiveTab('marketplace');
    } else if (tabParam === 'bridge') {
      setActiveTab('bridge');
    }
    // If no tab parameter is specified, keep default 'bridge'
  }, [searchParams]);

  const handleCollectionSelect = (collection: NFTCollection) => {
    setSelectedCollection(collection);
  };

  return (
    <div>
      {/* Dynamic title based on the selected tab */}
      <div className="mb-4 text-center">
        <h1 className="text-2xl font-bold text-[var(--app-accent)] mb-2">
          {activeTab === "bridge" 
            ? "Bridge NFTs from Sepolia to Base" 
            : "NFT Marketplace"
          }
        </h1>
        {activeTab === "bridge" && (
          <>
            <p className="text-gray-700">Sweep N Flip Collection:</p>
          </>
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-gray-100 p-1 rounded-lg shadow-sm">
          <Button
            variant={activeTab === "bridge" ? "primary" : "ghost"}
            className={`px-6 py-2.5 ${
              activeTab !== "bridge" ? "text-gray-600 hover:bg-gray-200" : ""
            }`}
            onClick={() => setActiveTab("bridge")}
          >
            <span>Bridge NFTs (Testnet)</span>
          </Button>
          <Button
            variant={activeTab === "marketplace" ? "primary" : "ghost"}
            className={`px-6 py-2.5 ${
              activeTab !== "marketplace" ? "text-gray-600 hover:bg-gray-200" : ""
            }`}
            onClick={() => setActiveTab("marketplace")}
          >
            <span>Buy NFTs</span>
          </Button>
        </div>
      </div>

      {/* Selected tab content */}
      {activeTab === "bridge" ? (
        <div>
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-[var(--app-accent)] mb-2">Bridge NFTs from Sepolia to Base</h1>
          </div>
          
          {selectedNetwork && (
            <CollectionList
              selectedNetwork={selectedNetwork}
              onSelectCollection={handleCollectionSelect}
              selectedCollection={selectedCollection}
            />
          )}
          
          {selectedCollection && (
            <div className="mt-6 w-[60%] mx-auto relative z-0">
              <NFTGrid 
                selectedCollection={selectedCollection} 
                selectedNetwork={selectedNetwork}
              />
            </div>
          )}
        </div>
      ) : (
        <MainnetMarketplace />
      )}
    </div>
  );
}
