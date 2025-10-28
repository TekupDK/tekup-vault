/**
 * Quick Test - Hurtig verifikation af systemet
 * Kører de vigtigste tests hurtigt
 */

const API_URL = 'http://localhost:3001';
const API_KEY = 'tekup_vault_api_key_2025_secure';

console.log('🚀 TekupVault Quick Test\n');
console.log('='.repeat(60));

async function quickTest() {
  try {
    // Test 1: Health Check
    console.log('\n1️⃣ Testing Health Endpoint...');
    const healthRes = await fetch(`${API_URL}/health`);
    const health = await healthRes.json();
    
    if (health.status === 'ok') {
      console.log('   ✅ API Server is running');
      console.log(`   📅 Timestamp: ${health.timestamp}`);
    } else {
      throw new Error('Health check failed');
    }
    
    // Test 2: Sync Status
    console.log('\n2️⃣ Testing Sync Status...');
    const syncRes = await fetch(`${API_URL}/api/sync-status`);
    const sync = await syncRes.json();
    
    if (sync.success && sync.items.length === 3) {
      console.log(`   ✅ Found ${sync.items.length} repositories`);
      sync.items.forEach(item => {
        const status = item.status === 'success' ? '✅' : '❌';
        console.log(`   ${status} ${item.repository}: ${item.status}`);
      });
    } else {
      throw new Error('Sync status check failed');
    }
    
    // Test 3: Search
    console.log('\n3️⃣ Testing Search...');
    const searchRes = await fetch(`${API_URL}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        query: 'authentication documentation',
        limit: 3,
        threshold: 0.2
      })
    });
    
    const search = await searchRes.json();
    
    if (search.success) {
      console.log(`   ✅ Search returned ${search.count} results`);
      
      if (search.count > 0) {
        console.log('\n   📄 Top results:');
        search.results.slice(0, 3).forEach((r, i) => {
          const repo = r.repository.split('/')[1];
          console.log(`      ${i + 1}. ${repo}/${r.path}`);
          console.log(`         Similarity: ${r.similarity.toFixed(3)}`);
        });
      } else {
        console.warn('   ⚠️  No results (embeddings might still be generating)');
      }
    } else {
      throw new Error('Search failed');
    }
    
    // Test 4: Edge Case
    console.log('\n4️⃣ Testing Error Handling...');
    const errorRes = await fetch(`${API_URL}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        query: '',
        limit: 10
      })
    });
    
    if (!errorRes.ok) {
      console.log('   ✅ Empty query correctly rejected');
    } else {
      const errorData = await errorRes.json();
      if (!errorData.success) {
        console.log('   ✅ Empty query handled gracefully');
      } else {
        console.warn('   ⚠️  Empty query should be rejected');
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Quick Test PASSED');
    console.log('\n💡 System is operational and ready to use!');
    console.log('\n📚 Run full test suite with: node run-all-tests.mjs');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Quick Test FAILED:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Is the API server running? (node apps/vault-api/dist/index.js)');
    console.error('   2. Is it on port 3001?');
    console.error('   3. Check .env configuration');
    console.error('\n');
    process.exit(1);
  }
}

quickTest();

