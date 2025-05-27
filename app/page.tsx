"use client";

import frameSDK from "@/lib/utils/frameSDK";
import {
    Address,
    Avatar,
    EthBalance,
    Identity,
    Name,
} from "@coinbase/onchainkit/identity";
import { useAddFrame, useMiniKit } from "@coinbase/onchainkit/minikit";
import {
    ConnectWallet,
    Wallet,
    WalletDropdown,
    WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import { useCallback, useEffect, useState } from "react";
import { Button, Header, Icon, Logo } from "./components/Main";
import { NFTTabsNavigation } from "./components/nft/NFTTabsNavigation";

export default function App() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const [frameAdded, setFrameAdded] = useState(false);

  const addFrame = useAddFrame();

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
    
    // Verifica se precisa redirecionar para o app Farcaster/Warpcast
    if (typeof window !== 'undefined') {
      // Detecta se está no ambiente de um MiniApp
      const isInApp = frameSDK.isInMiniApp();
      const isMobile = frameSDK.isMobileDevice();
      
      console.log("Ambiente detectado:", { 
        isInMiniApp: isInApp, 
        isMobile: isMobile,
        userAgent: window.navigator.userAgent
      });
      
      // Se for mobile mas não estiver no app, redireciona
      if (isMobile && !isInApp) {
        const searchParams = new URLSearchParams(window.location.search);
        const isShareAction = searchParams.get('action') === 'share';
        
        if (isShareAction) {
          console.log("Redirecionando para Warpcast app...");
          frameSDK.redirectToWarpcastAppIfNeeded();
        }
      }
    }
  }, [setFrameReady, isFrameReady]);

  const handleAddFrame = useCallback(async () => {
    const frameAdded = await addFrame();
    setFrameAdded(Boolean(frameAdded));
  }, [addFrame]);

  // Header component with logo and wallet
  const header = (
    <Header>
      <Logo />
      <div className="flex items-center">
        <Wallet className="z-10">
          <ConnectWallet className="bg-[#FF2E00] hover:bg-[#FF2E00]/80">
           <Name className="text-inherit" />
          </ConnectWallet>
          <WalletDropdown>
            <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
              <Avatar />
              <Name />
              <Address />
              <EthBalance />
            </Identity>
            <WalletDropdownDisconnect />
          </WalletDropdown>
        </Wallet>
      </div>
    </Header>
  );

  // Footer component
  const footer = (
    <footer className="py-4 border-t border-[var(--app-card-border)]">
      <div className="container mx-auto px-4">
        <div className="flex justify-center items-center">
          <div className="flex flex-col items-center space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 text-xs"
              onClick={() => window.open("https://base.org/builders/minikit", "_blank")}
            >
              Built on Base with MiniKit
            </Button>
            {context && !context.client.added && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddFrame}
                className="text-[var(--app-accent)] text-xs"
                icon={<Icon name="plus" size="sm" />}
              >
                Save Frame
              </Button>
            )}
            {frameAdded && (
              <div className="flex items-center space-x-1 text-sm font-medium text-[var(--app-accent)] animate-fade-out">
                <Icon name="check" size="sm" />
                <span>Frame Saved</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );

  return (
    <div className="flex flex-col min-h-screen bg-[var(--app-background)]">
      {header}
      <main className="flex-1 py-6">
        <div className="container mx-auto px-4">
          <NFTTabsNavigation />
        </div>
      </main>
      {footer}
    </div>
  );
}
