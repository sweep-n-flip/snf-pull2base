#!/usr/bin/env node

/**
 * Script de teste para verificar se a funcionalidade de redirecionamento para miniapp está funcionando
 */

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function testTransactionEndpointDisabled() {
  console.log('🔧 Testando se endpoint de transação está desabilitado...\n');

  // Parâmetros de teste
  const testParams = {
    network: '1', // Ethereum
    contract: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', // Bored Ape Yacht Club
    tokenId: '1'
  };

  const transactionUrl = `${baseUrl}/api/frames/nft/transaction?` + 
    new URLSearchParams(testParams).toString();

  console.log('🌐 URL de teste:', transactionUrl);
  console.log('📋 Parâmetros:', testParams);
  console.log('');

  try {
    console.log('📡 Fazendo requisição...');
    const response = await fetch(transactionUrl);
    
    console.log('📊 Status da resposta:', response.status);
    
    const responseText = await response.text();
    
    if (response.status === 400) {
      try {
        const data = JSON.parse(responseText);
        console.log('\n✅ Endpoint desabilitado corretamente:');
        console.log(JSON.stringify(data, null, 2));
        
        // Validar se contém a mensagem de redirecionamento
        if (data.redirectToMiniapp && data.message.includes('miniapp')) {
          console.log('✓ Mensagem de redirecionamento presente');
          console.log('✓ Flag redirectToMiniapp:', data.redirectToMiniapp);
        } else {
          console.log('❌ Resposta não contém redirecionamento para miniapp');
        }
      } catch (parseError) {
        console.log('\n❌ Erro ao parsear JSON:');
        console.log(responseText);
      }
    } else {
      console.log('\n❌ Endpoint não retornou status 400 como esperado');
      console.log('Response:', responseText);
    }
  } catch (error) {
    console.error('\n💥 Erro durante o teste:', error.message);
  }
}

async function testFrameDisplayWithLinkActions() {
  console.log('\n🖼️ Testando exibição do Frame com ações de link...\n');

  const testParams = {
    network: '1',
    contract: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
    tokenId: '1'
  };

  const frameUrl = `${baseUrl}/api/frames/nft?` + 
    new URLSearchParams(testParams).toString();

  console.log('🌐 URL do Frame:', frameUrl);

  try {
    const response = await fetch(frameUrl);
    console.log('📊 Status da resposta:', response.status);
    
    if (response.ok) {
      const html = await response.text();
      
      // Verificar se contém as meta tags necessárias para links (não transações)
      const hasFrameTag = html.includes('fc:frame');
      const hasLinkButton = html.includes('fc:frame:button:1:action') && html.includes('link');
      const hasTransactionButton = html.includes('fc:frame:button:1:action') && html.includes('tx');
      const hasLinkTarget = html.includes('fc:frame:button:1:target');
      const hasMiniAppText = html.includes('Buy in MiniApp');
      
      console.log('✓ Contém meta tag de frame:', hasFrameTag);
      console.log('✓ Contém botão de link (não transação):', hasLinkButton);
      console.log('✓ NÃO contém botão de transação:', !hasTransactionButton);
      console.log('✓ Contém target de link:', hasLinkTarget);
      console.log('✓ Contém texto "Buy in MiniApp":', hasMiniAppText);
      
      if (hasFrameTag && hasLinkButton && !hasTransactionButton && hasLinkTarget && hasMiniAppText) {
        console.log('\n🎯 Frame configurado corretamente para redirecionamento!');
      } else {
        console.log('\n❌ Frame ainda tem configuração de transação ou está incompleto');
        
        // Mostrar parte do HTML para debug
        const metaTags = html.match(/<meta[^>]*fc:frame[^>]*>/g) || [];
        console.log('\n📝 Meta tags encontradas:');
        metaTags.forEach(tag => console.log(tag));
      }
      
      // Verificar se o URL de redirecionamento contém parâmetros corretos
      const targetMatch = html.match(/fc:frame:button:1:target[^>]*content="([^"]+)"/);
      if (targetMatch) {
        const targetUrl = targetMatch[1];
        console.log('\n🔗 URL de redirecionamento:', targetUrl);
        
        const url = new URL(targetUrl);
        const hasNetworkParam = url.searchParams.has('network');
        const hasContractParam = url.searchParams.has('contract');
        const hasTokenIdParam = url.searchParams.has('tokenId');
        const hasFromFrameParam = url.searchParams.has('from');
        
        console.log('✓ Contém parâmetro network:', hasNetworkParam);
        console.log('✓ Contém parâmetro contract:', hasContractParam);
        console.log('✓ Contém parâmetro tokenId:', hasTokenIdParam);
        console.log('✓ Contém parâmetro from=frame:', hasFromFrameParam);
        
        if (hasNetworkParam && hasContractParam && hasTokenIdParam && hasFromFrameParam) {
          console.log('🎯 URL de redirecionamento contém todos os parâmetros necessários!');
        } else {
          console.log('❌ URL de redirecionamento está incompleta');
        }
      }
    } else {
      console.log('❌ Erro ao carregar Frame:', response.status);
    }
  } catch (error) {
    console.error('💥 Erro durante teste do Frame:', error.message);
  }
}

async function testDeviceDetection() {
  console.log('\n📱 Testando detecção de dispositivo...\n');

  const testParams = {
    network: '1',
    contract: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
    tokenId: '1'
  };

  const frameUrl = `${baseUrl}/api/frames/nft?` + 
    new URLSearchParams(testParams).toString();

  console.log('🌐 URL do Frame:', frameUrl);

  // Teste com diferentes user agents
  const userAgents = [
    {
      name: 'Desktop Chrome',
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      expectedMobile: false,
      expectedWarpcast: false
    },
    {
      name: 'Mobile Safari',
      ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      expectedMobile: true,
      expectedWarpcast: false
    },
    {
      name: 'Warpcast App',
      ua: 'Warpcast/1.0 (iPhone; iOS 14.6; WebKit)',
      expectedMobile: true,
      expectedWarpcast: true
    }
  ];

  for (const testCase of userAgents) {
    console.log(`\n🔍 Testando: ${testCase.name}`);
    console.log(`   User-Agent: ${testCase.ua}`);

    try {
      const response = await fetch(frameUrl, {
        headers: {
          'User-Agent': testCase.ua
        }
      });

      if (response.ok) {
        const html = await response.text();
        
        // Verificar se o URL contém parâmetro mobile
        const targetMatch = html.match(/fc:frame:button:1:target[^>]*content="([^"]+)"/);
        if (targetMatch) {
          const targetUrl = targetMatch[1];
          const url = new URL(targetUrl);
          const hasMobileParam = url.searchParams.has('mobile');
          
          console.log(`   Detectou mobile: ${hasMobileParam} (esperado: ${testCase.expectedMobile})`);
          console.log(`   URL gerada: ${targetUrl}`);
          
          if ((hasMobileParam && testCase.expectedMobile) || (!hasMobileParam && !testCase.expectedMobile)) {
            console.log('   ✅ Detecção correta!');
          } else {
            console.log('   ❌ Detecção incorreta!');
          }
        }
      }
    } catch (error) {
      console.error(`   💥 Erro: ${error.message}`);
    }
  }
}

// Executar testes
async function runTests() {
  console.log('🚀 Iniciando testes de redirecionamento para MiniApp\n');
  console.log('=' .repeat(60));
  
  await testFrameDisplayWithLinkActions();
  console.log('\n' + '=' .repeat(60));
  await testTransactionEndpointDisabled();
  console.log('\n' + '=' .repeat(60));
  await testDeviceDetection();
  
  console.log('\n' + '=' .repeat(60));
  console.log('✨ Testes concluídos!');
}

runTests().catch(console.error);
