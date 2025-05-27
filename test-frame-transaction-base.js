#!/usr/bin/env node

/**
 * Script de teste para verificar se a funcionalidade de transação do Frame está funcionando
 * especificamente com um NFT conhecido que está à venda na rede Base
 */

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function testTransactionEndpoint() {
  console.log('🔧 Testando endpoint de transação do Frame...\n');

  // Parâmetros de teste específicos para NFT na Base que sabemos estar à venda
  const testParams = {
    network: '2', // Base
    contract: '0x7fc9f75e9ce457d2aa89f9a3efd4b3bd608ba5ef', 
    tokenId: '84'
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

  // Mesmo NFT para o teste de frame
  const testParams = {
    network: '2', // Base
    contract: '0x7fc9f75e9ce457d2aa89f9a3efd4b3bd608ba5ef',
    tokenId: '84'
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

// Testar também a URL de produção fornecida
async function testProductionUrl() {
  console.log('\n🌎 Testando URL de produção fornecida...\n');
  
  const prodUrl = 'https://snf-pull2base.vercel.app/api/frames/nft?network=2&contract=0x7fc9f75e9ce457d2aa89f9a3efd4b3bd608ba5ef&tokenId=84';
  
  console.log('🌐 URL:', prodUrl);
  
  try {
    const response = await fetch(prodUrl);
    console.log('📊 Status:', response.status);
    
    if (response.ok) {
      const html = await response.text();
      
      // Verificar estrutura básica
      const hasFrameTag = html.includes('fc:frame');
      const hasTransactionButton = html.includes('fc:frame:button:1:action') && html.includes('tx');
      
      console.log('✓ Contém meta tag frame:', hasFrameTag);
      console.log('✓ Contém botão de transação:', hasTransactionButton);
      
      // Verificar URL de transação
      const txUrlMatch = html.match(/fc:frame:button:1:target[^>]*content="([^"]+)"/);
      if (txUrlMatch && txUrlMatch[1]) {
        console.log('✓ URL de transação:', txUrlMatch[1]);
        
        // Testar esta URL de transação
        try {
          console.log('\n📡 Testando URL de transação do frame de produção...');
          const txResponse = await fetch(txUrlMatch[1]);
          console.log('📊 Status:', txResponse.status);
          
          const txText = await txResponse.text();
          try {
            const txData = JSON.parse(txText);
            console.log('✓ Dados de transação válidos:', 
              txData.chainId ? 'chainId presente' : 'chainId ausente',
              txData.params ? 'params presentes' : 'params ausentes'
            );
          } catch (e) {
            console.log('❌ Resposta da transação não é um JSON válido');
          }
        } catch (e) {
          console.error('❌ Erro ao testar URL de transação:', e.message);
        }
      } else {
        console.log('❌ URL de transação não encontrada no frame');
      }
    } else {
      console.log('❌ Erro ao carregar Frame de produção');
    }
  } catch (error) {
    console.error('💥 Erro ao testar URL de produção:', error.message);
  }
}

// Executar testes
async function runTests() {
  console.log('🚀 Iniciando testes de Frame Transaction na Base\n');
  console.log('=' .repeat(50));
  
  await testFrameDisplay();
  console.log('\n' + '=' .repeat(50));
  await testTransactionEndpoint();
  console.log('\n' + '=' .repeat(50));
  await testProductionUrl();
  
  console.log('\n' + '=' .repeat(50));
  console.log('✨ Testes concluídos!');
}

runTests().catch(console.error);
