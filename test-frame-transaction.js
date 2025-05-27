#!/usr/bin/env node

/**
 * Script de teste para verificar se a funcionalidade de transação do Frame está funcionando
 */

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function testTransactionEndpoint() {
  console.log('🔧 Testando endpoint de transação do Frame...\n');

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
    console.log('📝 Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    
    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('\n✅ Resposta da transação:');
        console.log(JSON.stringify(data, null, 2));
        
        // Validar estrutura da resposta
        if (data.chainId && data.method && data.params) {
          console.log('\n🎯 Estrutura da resposta válida!');
          
          if (data.params.to && data.params.data) {
            console.log('✓ Dados de transação presentes');
            console.log('✓ Endereço "to":', data.params.to);
            console.log('✓ Dados:', data.params.data.substring(0, 20) + '...');
            console.log('✓ Valor:', data.params.value);
          } else {
            console.log('❌ Dados de transação incompletos');
          }
        } else {
          console.log('❌ Estrutura da resposta inválida');
        }
      } catch (parseError) {
        console.log('\n❌ Erro ao parsear JSON:');
        console.log(responseText);
      }
    } else {
      console.log('\n❌ Erro na requisição:');
      console.log(responseText);
    }
  } catch (error) {
    console.error('\n💥 Erro durante o teste:', error.message);
  }
}

async function testFrameDisplay() {
  console.log('\n🖼️ Testando exibição do Frame...\n');

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
      
      // Verificar se contém as meta tags necessárias
      const hasFrameTag = html.includes('fc:frame');
      const hasTransactionButton = html.includes('fc:frame:button:1:action') && html.includes('tx');
      const hasTransactionTarget = html.includes('fc:frame:button:1:target');
      
      console.log('✓ Contém meta tag de frame:', hasFrameTag);
      console.log('✓ Contém botão de transação:', hasTransactionButton);
      console.log('✓ Contém target de transação:', hasTransactionTarget);
      
      if (hasFrameTag && hasTransactionButton && hasTransactionTarget) {
        console.log('\n🎯 Frame configurado corretamente!');
      } else {
        console.log('\n❌ Frame com configuração incompleta');
        
        // Mostrar parte do HTML para debug
        const metaTags = html.match(/<meta[^>]*fc:frame[^>]*>/g) || [];
        console.log('\n📝 Meta tags encontradas:');
        metaTags.forEach(tag => console.log(tag));
      }
    } else {
      console.log('❌ Erro ao carregar Frame:', response.status);
    }
  } catch (error) {
    console.error('💥 Erro durante teste do Frame:', error.message);
  }
}

// Executar testes
async function runTests() {
  console.log('🚀 Iniciando testes de Frame Transaction\n');
  console.log('=' .repeat(50));
  
  await testFrameDisplay();
  console.log('\n' + '=' .repeat(50));
  await testTransactionEndpoint();
  
  console.log('\n' + '=' .repeat(50));
  console.log('✨ Testes concluídos!');
}

runTests().catch(console.error);
