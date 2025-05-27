#!/usr/bin/env node

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const TEST_NFT_PARAMS = {
  network: '1',
  contract: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
  tokenId: '1'
};

// Test utilities
const makeRequest = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = res.headers['content-type']?.includes('application/json') 
            ? JSON.parse(data) 
            : data;
          resolve({ status: res.statusCode, headers: res.headers, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
};

const logTest = (testName, passed, details = '') => {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${testName}`);
  if (details) console.log(`   ${details}`);
};

// Test suite
async function runTests() {
  console.log('🧪 Testing NFT Frame Miniapp Redirection Functionality\n');

  let allTestsPassed = true;

  // Test 1: Frame route returns link actions instead of transaction actions
  try {
    console.log('📋 Test 1: Frame route configuration');
    const frameUrl = `${BASE_URL}/api/frames/nft?network=${TEST_NFT_PARAMS.network}&contract=${TEST_NFT_PARAMS.contract}&tokenId=${TEST_NFT_PARAMS.tokenId}`;
    const response = await makeRequest(frameUrl);
    
    const isHtml = response.status === 200 && typeof response.data === 'string';
    logTest('Frame returns HTML', isHtml, `Status: ${response.status}`);
    
    if (isHtml) {
      const hasLinkAction = response.data.includes('fc:frame:button:1:action" content="link"');
      const noTxAction = !response.data.includes('fc:frame:button:1:action" content="tx"');
      const hasTargetUrl = response.data.includes('fc:frame:button:1:target');
      const hasMiniappUrl = response.data.includes('tab=marketplace');
      
      logTest('Button 1 configured as link action', hasLinkAction);
      logTest('No transaction action configured', noTxAction);
      logTest('Target URL is present', hasTargetUrl);
      logTest('Target points to miniapp', hasMiniappUrl);
      
      allTestsPassed = allTestsPassed && hasLinkAction && noTxAction && hasTargetUrl && hasMiniappUrl;
    } else {
      allTestsPassed = false;
    }
  } catch (error) {
    logTest('Frame route test', false, `Error: ${error.message}`);
    allTestsPassed = false;
  }

  console.log('');

  // Test 2: Transaction endpoint returns redirection message
  try {
    console.log('📋 Test 2: Transaction endpoint redirection');
    const txUrl = `${BASE_URL}/api/frames/nft/transaction?network=${TEST_NFT_PARAMS.network}&contract=${TEST_NFT_PARAMS.contract}&tokenId=${TEST_NFT_PARAMS.tokenId}`;
    const response = await makeRequest(txUrl);
    
    const is400Status = response.status === 400;
    logTest('Returns 400 status', is400Status, `Status: ${response.status}`);
    
    if (typeof response.data === 'object') {
      const hasError = response.data.error === 'Transaction not available in frames';
      const hasMessage = response.data.message?.includes('miniapp');
      const hasRedirectUrl = response.data.redirectUrl?.includes('tab=marketplace');
      const hasAction = response.data.action === 'redirect_to_miniapp';
      
      logTest('Contains correct error message', hasError);
      logTest('Contains miniapp instruction', hasMessage);
      logTest('Contains redirect URL', hasRedirectUrl);
      logTest('Contains redirect action', hasAction);
      
      allTestsPassed = allTestsPassed && is400Status && hasError && hasMessage && hasRedirectUrl && hasAction;
    } else {
      logTest('Returns JSON response', false, 'Response is not JSON');
      allTestsPassed = false;
    }
  } catch (error) {
    logTest('Transaction endpoint test', false, `Error: ${error.message}`);
    allTestsPassed = false;
  }

  console.log('');

  // Test 3: CORS functionality
  try {
    console.log('📋 Test 3: CORS configuration');
    const options = {
      method: 'OPTIONS',
      headers: { 'Origin': 'https://warpcast.com' }
    };
    const response = await makeRequest(`${BASE_URL}/api/frames/nft/transaction`, options);
    
    const is200Status = response.status === 200;
    const hasAllowOrigin = response.headers['access-control-allow-origin'] === 'https://warpcast.com';
    const hasMethods = response.headers['access-control-allow-methods']?.includes('GET');
    const hasCredentials = response.headers['access-control-allow-credentials'] === 'true';
    
    logTest('OPTIONS returns 200', is200Status, `Status: ${response.status}`);
    logTest('Allows Warpcast origin', hasAllowOrigin, `Origin: ${response.headers['access-control-allow-origin']}`);
    logTest('Allows GET method', hasMethods);
    logTest('Allows credentials', hasCredentials);
    
    allTestsPassed = allTestsPassed && is200Status && hasAllowOrigin && hasMethods && hasCredentials;
  } catch (error) {
    logTest('CORS test', false, `Error: ${error.message}`);
    allTestsPassed = false;
  }

  console.log('');

  // Test 4: Missing parameters handling
  try {
    console.log('📋 Test 4: Error handling for missing parameters');
    const response = await makeRequest(`${BASE_URL}/api/frames/nft/transaction?network=1`);
    
    const is400Status = response.status === 400;
    const hasErrorMessage = response.data?.error === 'Missing required parameters';
    const hasMiniappMessage = response.data?.message?.includes('miniapp');
    
    logTest('Returns 400 for missing params', is400Status, `Status: ${response.status}`);
    logTest('Contains missing params error', hasErrorMessage);
    logTest('Still mentions miniapp', hasMiniappMessage);
    
    allTestsPassed = allTestsPassed && is400Status && hasErrorMessage && hasMiniappMessage;
  } catch (error) {
    logTest('Missing parameters test', false, `Error: ${error.message}`);
    allTestsPassed = false;
  }

  console.log('');

  // Summary
  if (allTestsPassed) {
    console.log('🎉 All tests passed! Frame redirection is working correctly.');
    console.log('✅ Users will be redirected to miniapp instead of attempting transactions in frames.');
    console.log('✅ CORS is properly configured for Farcaster clients.');
    console.log('✅ Error handling provides clear redirection instructions.');
  } else {
    console.log('❌ Some tests failed. Please review the implementation.');
  }

  console.log('\n📝 Summary:');
  console.log('- Frame button 1 (Buy NFT) now uses link action instead of transaction action');
  console.log('- Transaction endpoint returns 400 with redirection message');
  console.log('- All requests properly redirect users to miniapp for purchases');
  console.log('- CORS headers are configured for Farcaster Frame clients');

  process.exit(allTestsPassed ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});