"use client";

import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { type ReactNode } from "react";
import { arbitrumSepolia, baseSepolia, optimismSepolia, polygonMumbai, sepolia } from "wagmi/chains";

export function Providers(props: { children: ReactNode }) {
  return (
    <MiniKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={sepolia}
      config={{
        appearance: {
          mode: "auto",
          theme: "mini-app-theme",
          name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
          logo: process.env.NEXT_PUBLIC_ICON_URL,
        },
        wallets: {
          chains: [
            sepolia, 
            baseSepolia, 
            optimismSepolia, 
            arbitrumSepolia, 
            polygonMumbai
          ],
        },
      }}
    >
      {props.children}
    </MiniKitProvider>
  );
}
