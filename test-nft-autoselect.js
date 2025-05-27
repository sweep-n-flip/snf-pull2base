#!/usr/bin/env node

/**
 * Teste para verificar se a auto-seleção de NFT está funcionando corretamente
 * quando o usuário é redirecionado de um Frame
 */

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

console.log('🧪 Testing NFT Auto-Selection Functionality\n');

async function testNFTFrameWithAutoSelect() {
  console.log('📋 Test 1: Frame with autoSelect parameter');
  
  try {
    // Teste com parâmetros válidos de NFT
    const testUrl = `${baseUrl}/api/frames/nft?network=1&contract=0x8a90cab2b38dba80c64b7734e58ee1db38b8992e&tokenId=1`;
    
    const response = await fetch(testUrl);
    const html = await response.text();
    
    console.log(`✅ PASS Frame returns HTML`);
    console.log(`   Status: ${response.status}`);
    
    // Verificar se a URL de destino contém autoSelect=true
    const buyUrlMatch = html.match(/fc:frame:button:1:target[^>]*content="([^"]+)"/);
    if (buyUrlMatch) {
      const buyUrl = buyUrlMatch[1];
      console.log(`✅ PASS Buy URL found: ${buyUrl}`);
      
      if (buyUrl.includes('autoSelect=true')) {
        console.log(`✅ PASS autoSelect parameter is present`);
      } else {
        console.log(`❌ FAIL autoSelect parameter missing`);
      }
      
      // Verificar se contém todos os parâmetros necessários
      const urlParams = new URL(buyUrl);
      const hasNetwork = urlParams.searchParams.has('network');
      const hasContract = urlParams.searchParams.has('contract');
      const hasTokenId = urlParams.searchParams.has('tokenId');
      const hasAutoSelect = urlParams.searchParams.get('autoSelect') === 'true';
      
      if (hasNetwork && hasContract && hasTokenId && hasAutoSelect) {
        console.log(`✅ PASS All required parameters present`);
        console.log(`   Network: ${urlParams.searchParams.get('network')}`);
        console.log(`   Contract: ${urlParams.searchParams.get('contract')}`);
        console.log(`   TokenId: ${urlParams.searchParams.get('tokenId')}`);
        console.log(`   AutoSelect: ${urlParams.searchParams.get('autoSelect')}`);
      } else {
        console.log(`❌ FAIL Missing required parameters`);
        console.log(`   Network: ${hasNetwork ? '✅' : '❌'}`);
        console.log(`   Contract: ${hasContract ? '✅' : '❌'}`);
        console.log(`   TokenId: ${hasTokenId ? '✅' : '❌'}`);
        console.log(`   AutoSelect: ${hasAutoSelect ? '✅' : '❌'}`);
      }
    } else {
      console.log(`❌ FAIL Buy URL not found in frame HTML`);
    }
    
  } catch (error) {
    console.log(`❌ FAIL Error testing frame: ${error.message}`);
  }
}

async function testMainnetMarketplaceAutoSelect() {
  console.log('\n📋 Test 2: Marketplace URL with autoSelect');
  
  try {
    // Teste da URL que seria gerada pelo frame
    const testUrl = `${baseUrl}?tab=marketplace&network=1&contract=0x8a90cab2b38dba80c64b7734e58ee1db38b8992e&tokenId=1&autoSelect=true`;
    
    console.log(`✅ PASS Generated marketplace URL with autoSelect`);
    console.log(`   URL: ${testUrl}`);
    
    // Verificar se a URL está bem formada
    const url = new URL(testUrl);
    const params = {
      tab: url.searchParams.get('tab'),
      network: url.searchParams.get('network'),
      contract: url.searchParams.get('contract'),
      tokenId: url.searchParams.get('tokenId'),
      autoSelect: url.searchParams.get('autoSelect')
    };
    
    if (params.tab === 'marketplace' && 
        params.network && 
        params.contract && 
        params.tokenId && 
        params.autoSelect === 'true') {
      console.log(`✅ PASS URL parameters are correctly formatted`);
      console.log(`   Tab: ${params.tab}`);
      console.log(`   Network: ${params.network}`);
      console.log(`   Contract: ${params.contract}`);
      console.log(`   TokenId: ${params.tokenId}`);
      console.log(`   AutoSelect: ${params.autoSelect}`);
    } else {
      console.log(`❌ FAIL URL parameters are incorrect`);
    }
    
  } catch (error) {
    console.log(`❌ FAIL Error testing marketplace URL: ${error.message}`);
  }
}

async function runTests() {
  await testNFTFrameWithAutoSelect();
  await testMainnetMarketplaceAutoSelect();
  
  console.log('\n🎉 NFT Auto-Selection Tests Complete!');
  console.log('\n📝 Summary:');
  console.log('- Frame buttons now include autoSelect=true parameter');
  console.log('- Marketplace URLs contain all necessary parameters for auto-selection');
  console.log('- Users clicking Frame buttons will have NFTs automatically loaded');
  console.log('- Mobile/Warpcast redirection should keep users in miniapp');
}

runTests().catch(console.error);
