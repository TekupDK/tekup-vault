/**
 * Test Scenario 1: Search Quality & Relevance
 * Tests forskellige query typer og verificerer resultatkvalitet
 */

const API_URL = 'http://localhost:3001';
const API_KEY = 'tekup_vault_api_key_2025_secure';

const testQueries = [
  {
    name: 'Authentication Query',
    query: 'How does user authentication work in the backend?',
    expectedRepos: ['renos-backend'],
    expectedKeywords: ['auth', 'login', 'password', 'jwt', 'token'],
    minSimilarity: 0.6
  },
  {
    name: 'React Component Query',
    query: 'Show me React components with form validation',
    expectedRepos: ['renos-frontend'],
    expectedKeywords: ['react', 'component', 'form', 'validation', 'tsx'],
    minSimilarity: 0.5
  },
  {
    name: 'API Integration Query',
    query: 'How to integrate with Billy.dk accounting API?',
    expectedRepos: ['Tekup-Billy'],
    expectedKeywords: ['billy', 'api', 'invoice', 'accounting'],
    minSimilarity: 0.6
  },
  {
    name: 'Database Schema Query',
    query: 'What is the database schema for customers and bookings?',
    expectedRepos: ['renos-backend'],
    expectedKeywords: ['prisma', 'schema', 'customer', 'booking', 'database'],
    minSimilarity: 0.5
  },
  {
    name: 'Configuration Query',
    query: 'Environment variables and configuration setup',
    expectedRepos: ['renos-backend', 'renos-frontend', 'Tekup-Billy'],
    expectedKeywords: ['env', 'config', 'environment', 'variable'],
    minSimilarity: 0.5
  },
  {
    name: 'Error Handling Query',
    query: 'How are errors handled and logged in the application?',
    expectedRepos: ['renos-backend', 'Tekup-Billy'],
    expectedKeywords: ['error', 'catch', 'try', 'logger', 'log'],
    minSimilarity: 0.4
  },
  {
    name: 'Deployment Query',
    query: 'Docker deployment and production setup',
    expectedRepos: ['Tekup-Billy', 'renos-backend'],
    expectedKeywords: ['docker', 'deploy', 'production', 'render'],
    minSimilarity: 0.5
  },
  {
    name: 'Testing Query',
    query: 'Unit tests and integration testing examples',
    expectedRepos: ['renos-backend', 'Tekup-Billy'],
    expectedKeywords: ['test', 'vitest', 'jest', 'spec'],
    minSimilarity: 0.4
  }
];

async function runSearchTest(testCase) {
  console.log(`\n🔍 Testing: ${testCase.name}`);
  console.log(`   Query: "${testCase.query}"\n`);
  
  try {
    const response = await fetch(`${API_URL}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        query: testCase.query,
        limit: 10,
        threshold: testCase.minSimilarity - 0.1 // Slightly lower threshold for testing
      })
    });
    
    if (!response.ok) {
      console.error(`   ❌ API Error: ${response.status} ${response.statusText}`);
      return { passed: false, error: 'API error' };
    }
    
    const data = await response.json();
    
    // Check if we got results
    if (!data.success || data.count === 0) {
      console.warn(`   ⚠️  No results found`);
      return { passed: false, error: 'No results', data };
    }
    
    console.log(`   ✅ Found ${data.count} results`);
    
    // Analyze results
    const results = data.results;
    let passedChecks = 0;
    let totalChecks = 0;
    
    // Check 1: Repository relevance
    totalChecks++;
    const foundRepos = [...new Set(results.map(r => r.repository.split('/')[1]))];
    const expectedRepoMatch = testCase.expectedRepos.some(repo => 
      foundRepos.includes(repo)
    );
    
    if (expectedRepoMatch) {
      console.log(`   ✅ Found results from expected repos: ${foundRepos.join(', ')}`);
      passedChecks++;
    } else {
      console.warn(`   ⚠️  Expected repos: ${testCase.expectedRepos.join(', ')}, Got: ${foundRepos.join(', ')}`);
    }
    
    // Check 2: Similarity scores
    totalChecks++;
    const avgSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length;
    const highQualityResults = results.filter(r => r.similarity >= testCase.minSimilarity).length;
    
    console.log(`   📊 Average similarity: ${avgSimilarity.toFixed(3)}`);
    console.log(`   📊 High quality results (≥${testCase.minSimilarity}): ${highQualityResults}/${results.length}`);
    
    if (highQualityResults > 0) {
      passedChecks++;
    }
    
    // Check 3: Keyword relevance (in top 3 results)
    totalChecks++;
    const topResults = results.slice(0, 3);
    const foundKeywords = testCase.expectedKeywords.filter(keyword => {
      return topResults.some(result => 
        result.content.toLowerCase().includes(keyword.toLowerCase()) ||
        result.path.toLowerCase().includes(keyword.toLowerCase())
      );
    });
    
    if (foundKeywords.length >= testCase.expectedKeywords.length / 2) {
      console.log(`   ✅ Found keywords: ${foundKeywords.join(', ')}`);
      passedChecks++;
    } else {
      console.warn(`   ⚠️  Expected keywords: ${testCase.expectedKeywords.join(', ')}`);
      console.warn(`   ⚠️  Found only: ${foundKeywords.join(', ')}`);
    }
    
    // Show top 3 results
    console.log(`\n   📄 Top 3 Results:`);
    topResults.forEach((result, idx) => {
      const repo = result.repository.split('/')[1];
      console.log(`      ${idx + 1}. ${repo}/${result.path} (${result.similarity.toFixed(3)})`);
    });
    
    const score = (passedChecks / totalChecks) * 100;
    const passed = score >= 66; // At least 2/3 checks passed
    
    console.log(`\n   🎯 Score: ${score.toFixed(0)}% (${passedChecks}/${totalChecks} checks passed)`);
    console.log(`   ${passed ? '✅ PASSED' : '❌ FAILED'}`);
    
    return {
      passed,
      score,
      passedChecks,
      totalChecks,
      resultCount: data.count,
      avgSimilarity
    };
    
  } catch (error) {
    console.error(`   ❌ Test Error: ${error.message}`);
    return { passed: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('🧪 TekupVault Search Quality Tests\n');
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const testCase of testQueries) {
    const result = await runSearchTest(testCase);
    results.push({
      name: testCase.name,
      ...result
    });
    
    // Wait a bit between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalScore = results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length;
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`🎯 Average Score: ${totalScore.toFixed(0)}%\n`);
  
  results.forEach(r => {
    const status = r.passed ? '✅' : '❌';
    const score = r.score !== undefined ? ` (${r.score.toFixed(0)}%)` : '';
    console.log(`${status} ${r.name}${score}`);
  });
  
  console.log('\n' + '='.repeat(60));
  
  const overallPassed = (passed / results.length) >= 0.75;
  console.log(`\n${overallPassed ? '✅ OVERALL: PASSED' : '❌ OVERALL: FAILED'}`);
  console.log(`(${passed}/${results.length} tests passed, ${totalScore.toFixed(0)}% average score)`);
}

runAllTests().catch(console.error);

