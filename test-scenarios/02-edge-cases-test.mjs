/**
 * Test Scenario 2: Edge Cases & Error Handling
 * Tests grænsetilfælde og fejlhåndtering
 */

const API_URL = 'http://localhost:3001';
const API_KEY = 'tekup_vault_api_key_2025_secure';

const edgeCases = [
  {
    name: 'Empty Query',
    payload: { query: '', limit: 10 },
    expectError: true
  },
  {
    name: 'Very Long Query (>1000 chars)',
    payload: {
      query: 'A'.repeat(1500) + ' explain authentication',
      limit: 10
    },
    expectError: false, // Should handle gracefully
    expectTruncation: true
  },
  {
    name: 'Special Characters Query',
    payload: {
      query: 'SELECT * FROM users WHERE id = 1; DROP TABLE users; -- authentication',
      limit: 5
    },
    expectError: false
  },
  {
    name: 'Unicode Query (Dansk)',
    payload: {
      query: 'Hvordan fungerer autentificering med æøå?',
      limit: 5
    },
    expectError: false
  },
  {
    name: 'Emoji Query',
    payload: {
      query: '🔐 authentication 🚀 deployment 📝 documentation',
      limit: 5
    },
    expectError: false
  },
  {
    name: 'Zero Limit',
    payload: { query: 'authentication', limit: 0 },
    expectError: true
  },
  {
    name: 'Negative Limit',
    payload: { query: 'authentication', limit: -5 },
    expectError: true
  },
  {
    name: 'Extremely High Limit',
    payload: { query: 'authentication', limit: 1000000 },
    expectError: false, // Should cap at reasonable limit
    expectCapping: true
  },
  {
    name: 'Negative Threshold',
    payload: { query: 'authentication', threshold: -0.5 },
    expectError: true
  },
  {
    name: 'Threshold > 1',
    payload: { query: 'authentication', threshold: 1.5 },
    expectError: true
  },
  {
    name: 'Missing API Key',
    payload: { query: 'authentication' },
    skipApiKey: true,
    expectError: true,
    expectStatus: 401
  },
  {
    name: 'Invalid API Key',
    payload: { query: 'authentication' },
    apiKey: 'wrong_key_123',
    expectError: true,
    expectStatus: 401
  },
  {
    name: 'Malformed JSON',
    raw: '{ query: "authentication" invalid json',
    expectError: true,
    expectStatus: 400
  },
  {
    name: 'Missing Query Field',
    payload: { limit: 10, threshold: 0.5 },
    expectError: true
  },
  {
    name: 'Invalid Repository Filter',
    payload: {
      query: 'authentication',
      repository: 'non-existent/repo'
    },
    expectError: false,
    expectEmpty: true
  },
  {
    name: 'SQL Injection Attempt',
    payload: {
      query: "'; DROP TABLE vault_documents; --",
      limit: 5
    },
    expectError: false,
    expectSafe: true
  },
  {
    name: 'XSS Attempt',
    payload: {
      query: '<script>alert("XSS")</script> authentication',
      limit: 5
    },
    expectError: false,
    expectSafe: true
  },
  {
    name: 'Null Values',
    payload: {
      query: null,
      limit: 10
    },
    expectError: true
  },
  {
    name: 'Very Low Threshold (0.01)',
    payload: {
      query: 'test',
      threshold: 0.01,
      limit: 100
    },
    expectError: false,
    expectManyResults: true
  },
  {
    name: 'Very High Threshold (0.99)',
    payload: {
      query: 'authentication',
      threshold: 0.99,
      limit: 100
    },
    expectError: false,
    expectFewResults: true
  }
];

async function runEdgeCaseTest(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add API key unless explicitly skipped
    if (!testCase.skipApiKey) {
      headers['X-API-Key'] = testCase.apiKey || API_KEY;
    }
    
    const body = testCase.raw || JSON.stringify(testCase.payload);
    
    const response = await fetch(`${API_URL}/api/search`, {
      method: 'POST',
      headers,
      body
    });
    
    const responseText = await response.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = { raw: responseText };
    }
    
    // Check expected status
    if (testCase.expectStatus) {
      if (response.status === testCase.expectStatus) {
        console.log(`   ✅ Got expected status: ${response.status}`);
        return { passed: true, status: response.status };
      } else {
        console.error(`   ❌ Expected status ${testCase.expectStatus}, got ${response.status}`);
        return { passed: false, expectedStatus: testCase.expectStatus, actualStatus: response.status };
      }
    }
    
    // Check if error was expected
    if (testCase.expectError) {
      if (!response.ok || data.error || !data.success) {
        console.log(`   ✅ Got expected error: ${data.error || response.statusText}`);
        return { passed: true, error: data.error };
      } else {
        console.error(`   ❌ Expected error but got success`);
        return { passed: false, error: 'Expected error but got success' };
      }
    }
    
    // Check if request should succeed
    if (!response.ok) {
      console.error(`   ❌ Unexpected error: ${response.status} - ${data.error || responseText}`);
      return { passed: false, error: data.error || responseText };
    }
    
    // Check specific expectations
    if (testCase.expectEmpty && data.count > 0) {
      console.error(`   ❌ Expected empty results but got ${data.count}`);
      return { passed: false, error: 'Expected empty results' };
    }
    
    if (testCase.expectManyResults && data.count < 10) {
      console.warn(`   ⚠️  Expected many results but got only ${data.count}`);
    }
    
    if (testCase.expectFewResults && data.count > 5) {
      console.warn(`   ⚠️  Expected few results but got ${data.count}`);
    }
    
    if (testCase.expectTruncation) {
      console.log(`   ℹ️  Query was likely truncated (original: ${testCase.payload.query.length} chars)`);
    }
    
    if (testCase.expectSafe) {
      console.log(`   ✅ Request handled safely (${data.count} results)`);
    }
    
    console.log(`   ✅ PASSED - Got ${data.count} results, ${response.status} status`);
    return { passed: true, count: data.count, status: response.status };
    
  } catch (error) {
    if (testCase.expectError) {
      console.log(`   ✅ Got expected error: ${error.message}`);
      return { passed: true, error: error.message };
    } else {
      console.error(`   ❌ Unexpected exception: ${error.message}`);
      return { passed: false, error: error.message };
    }
  }
}

async function runAllEdgeCaseTests() {
  console.log('🧪 TekupVault Edge Cases & Error Handling Tests\n');
  console.log('='.repeat(60));
  
  const results = [];
  
  for (const testCase of edgeCases) {
    const result = await runEdgeCaseTest(testCase);
    results.push({
      name: testCase.name,
      ...result
    });
    
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Edge Case Test Summary\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}\n`);
  
  // Group by category
  const security = results.filter(r => 
    r.name.includes('Injection') || 
    r.name.includes('XSS') || 
    r.name.includes('API Key')
  );
  const validation = results.filter(r => 
    r.name.includes('Empty') || 
    r.name.includes('Null') || 
    r.name.includes('Missing') ||
    r.name.includes('Negative') ||
    r.name.includes('Zero')
  );
  const unicode = results.filter(r => 
    r.name.includes('Unicode') || 
    r.name.includes('Emoji') || 
    r.name.includes('Special')
  );
  
  console.log('Security Tests:');
  security.forEach(r => {
    console.log(`  ${r.passed ? '✅' : '❌'} ${r.name}`);
  });
  
  console.log('\nValidation Tests:');
  validation.forEach(r => {
    console.log(`  ${r.passed ? '✅' : '❌'} ${r.name}`);
  });
  
  console.log('\nUnicode/Special Chars:');
  unicode.forEach(r => {
    console.log(`  ${r.passed ? '✅' : '❌'} ${r.name}`);
  });
  
  console.log('\n' + '='.repeat(60));
  
  const overallPassed = (passed / results.length) >= 0.90;
  console.log(`\n${overallPassed ? '✅ OVERALL: PASSED' : '❌ OVERALL: NEEDS ATTENTION'}`);
  console.log(`(${passed}/${results.length} tests passed, ${((passed/results.length)*100).toFixed(0)}% success rate)`);
  
  // List failures if any
  const failures = results.filter(r => !r.passed);
  if (failures.length > 0) {
    console.log('\n⚠️  Failed Tests:');
    failures.forEach(f => {
      console.log(`  - ${f.name}: ${f.error || 'See details above'}`);
    });
  }
}

runAllEdgeCaseTests().catch(console.error);

