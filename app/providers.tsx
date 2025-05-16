"use client";

import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { type ReactNode } from "react";
import { sepolia } from "wagmi/chains";

export function Providers(props: { children: ReactNode }) {
  // Usa a URL absoluta para o logo
  const logoUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/logo.png` 
    : '/logo.png';

  return (
    <MiniKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={sepolia}
      config={{
        appearance: {
          mode: "auto",
          theme: "mini-app-theme",
          name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
          logo: logoUrl,
        }
      }}
    >
      {props.children}
    </MiniKitProvider>
  );
}
