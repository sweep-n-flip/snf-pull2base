# Pull 2 Base

Aplicação Bridge para NFTs de Sepolia para Base, utilizando MiniKit e API Reservoir.

## Descrição

Esta aplicação permite aos usuários:
1. Selecionar NFTs de coleções na testnet Sepolia
2. Iniciar um processo de bridge para Base Sepolia
3. A aplicação compra automaticamente o NFT usando uma carteira de compra pré-configurada
4. O usuário confirma apenas a transação de bridge

## Configuração

1. Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```bash
# Carteira de compra automática (com fundos em Sepolia)
NEXT_PUBLIC_PURCHASE_WALLET_ADDRESS=0x...
PURCHASE_WALLET_PRIVATE_KEY=0x...

# URL RPC para Sepolia
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://rpc.sepolia.org

# MiniKit
NEXT_PUBLIC_ONCHAINKIT_API_KEY=sua_chave_aqui
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=Pull2Base

# Reservoir API
NEXT_PUBLIC_RESERVOIR_API_KEY=sua_chave_reservoir
```

2. Instale as dependências:
```bash
npm install
# ou
yarn install
# ou
pnpm install
```

3. Execute o projeto:

```bash
npm run dev
# ou
yarn dev
# ou
pnpm dev
```

## Arquitetura

- **app/**: Componentes da interface e página principal
- **lib/services/**: 
  - `bridge.ts`: Configurações e funções para a bridge entre Sepolia e Base
  - `purchase.ts`: Serviço de compra automática de NFTs
  - `reservoir.ts`: Integração com a API Reservoir para buscar dados de NFTs

## Fluxo do aplicativo

1. O aplicativo mostra apenas uma coleção NFT específica em Sepolia (0xA1e094C81E4cB385b40f5B707a4c3657029D6918)
2. O usuário escolhe um NFT específico para fazer bridge
3. Ao clicar em "Bridge to Base", o aplicativo:
   - Verifica se o NFT está à venda
   - Compra automaticamente o NFT usando a carteira configurada
   - Solicita ao usuário que confirme a transação de bridge
4. O NFT é transferido para Base Sepolia no endereço do usuário

## Tecnologias utilizadas

- [MiniKit](https://docs.base.org/builderkits/minikit/overview): Framework para desenvolvimento de aplicações Web3
- [Reservoir API](https://docs.reservoir.tools/reference/overview): API para acesso a dados de NFTs
- [ethers.js](https://docs.ethers.org/): Biblioteca para interação com contratos Ethereum
- [Next.js](https://nextjs.org/docs): Framework React para desenvolvimento web
- [Tailwind CSS](https://tailwindcss.com/docs): Framework CSS para estilização
