/**
 * Test Scenario 4: Data Integrity & Consistency
 * Verificerer data kvalitet og konsistens
 */

const API_URL = 'http://localhost:3001';
const API_KEY = 'tekup_vault_api_key_2025_secure';

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...options.headers
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  
  return await response.json();
}

class DataIntegrityTest {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.passed = [];
  }

  async testSyncStatus() {
    console.log('\n📋 Testing Sync Status...\n');
    
    const data = await apiRequest('/api/sync-status');
    
    if (!data.success) {
      this.issues.push('Sync status API failed');
      console.error('   ❌ API returned success=false');
      return;
    }
    
    const repos = data.items;
    const expectedRepos = [
      'JonasAbde/renos-backend',
      'JonasAbde/renos-frontend',
      'JonasAbde/Tekup-Billy'
    ];
    
    // Check all expected repos are present
    for (const expectedRepo of expectedRepos) {
      const found = repos.find(r => r.repository === expectedRepo);
      
      if (!found) {
        this.issues.push(`Missing repository: ${expectedRepo}`);
        console.error(`   ❌ Missing: ${expectedRepo}`);
      } else if (found.status !== 'success') {
        this.issues.push(`${expectedRepo} has status: ${found.status}`);
        console.error(`   ❌ ${expectedRepo}: ${found.status}`);
        if (found.error_message) {
          console.error(`      Error: ${found.error_message}`);
        }
      } else {
        this.passed.push(`${expectedRepo} synced successfully`);
        console.log(`   ✅ ${expectedRepo}: ${found.status}`);
        
        if (found.last_sync_at) {
          const syncDate = new Date(found.last_sync_at);
          const hoursSinceSync = (Date.now() - syncDate.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceSync > 24) {
            this.warnings.push(`${expectedRepo} last synced ${hoursSinceSync.toFixed(1)} hours ago`);
            console.warn(`      ⚠️  Last sync: ${hoursSinceSync.toFixed(1)} hours ago`);
          } else {
            console.log(`      Last sync: ${syncDate.toLocaleString('da-DK')}`);
          }
        }
      }
    }
    
    // Check for unexpected repos
    const unexpectedRepos = repos.filter(r => !expectedRepos.includes(r.repository));
    if (unexpectedRepos.length > 0) {
      this.warnings.push(`Found ${unexpectedRepos.length} unexpected repositories`);
      console.warn(`\n   ⚠️  Unexpected repositories:`);
      unexpectedRepos.forEach(r => console.warn(`      - ${r.repository}`));
    }
  }

  async testRepositoryConsistency() {
    console.log('\n\n🔍 Testing Repository Consistency...\n');
    
    const repos = ['JonasAbde/renos-backend', 'JonasAbde/renos-frontend', 'JonasAbde/Tekup-Billy'];
    
    for (const repo of repos) {
      const result = await apiRequest('/api/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'test',
          repository: repo,
          limit: 1,
          threshold: 0.01
        })
      });
      
      if (result.count > 0) {
        console.log(`   ✅ ${repo}: Has indexed documents`);
        this.passed.push(`${repo} has indexed documents`);
      } else {
        this.warnings.push(`${repo} has no indexed documents or embeddings`);
        console.warn(`   ⚠️  ${repo}: No indexed documents found`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  async testDataTypes() {
    console.log('\n\n🔎 Testing Data Types & Structure...\n');
    
    const result = await apiRequest('/api/search', {
      method: 'POST',
      body: JSON.stringify({
        query: 'test query for data validation',
        limit: 5,
        threshold: 0.1
      })
    });
    
    if (result.count === 0) {
      this.warnings.push('No results for data type validation');
      console.warn('   ⚠️  No results to validate data types');
      return;
    }
    
    const sample = result.results[0];
    const requiredFields = ['id', 'source', 'repository', 'path', 'content', 'similarity'];
    
    for (const field of requiredFields) {
      if (!(field in sample)) {
        this.issues.push(`Missing required field: ${field}`);
        console.error(`   ❌ Missing field: ${field}`);
      } else {
        console.log(`   ✅ Field present: ${field}`);
      }
    }
    
    // Check field types
    const typeChecks = [
      { field: 'id', type: 'string', check: v => typeof v === 'string' && v.length > 0 },
      { field: 'source', type: 'string', check: v => v === 'github' },
      { field: 'repository', type: 'string', check: v => v.includes('/') },
      { field: 'path', type: 'string', check: v => typeof v === 'string' },
      { field: 'content', type: 'string', check: v => typeof v === 'string' },
      { field: 'similarity', type: 'number', check: v => typeof v === 'number' && v >= 0 && v <= 1 },
    ];
    
    console.log('\n   Type validation:');
    for (const { field, type, check } of typeChecks) {
      if (sample[field] !== undefined && check(sample[field])) {
        console.log(`   ✅ ${field}: ${type} ✓`);
        this.passed.push(`${field} has correct type`);
      } else {
        this.issues.push(`${field} has invalid type or value`);
        console.error(`   ❌ ${field}: Expected ${type}, got ${typeof sample[field]}`);
      }
    }
  }

  async testFileTypeDistribution() {
    console.log('\n\n📊 Testing File Type Distribution...\n');
    
    const result = await apiRequest('/api/search', {
      method: 'POST',
      body: JSON.stringify({
        query: 'documentation code configuration',
        limit: 100,
        threshold: 0.1
      })
    });
    
    if (result.count === 0) {
      this.warnings.push('No results for file type distribution check');
      console.warn('   ⚠️  No results to analyze');
      return;
    }
    
    const fileTypes = {};
    result.results.forEach(r => {
      const ext = r.path.split('.').pop() || 'no-ext';
      fileTypes[ext] = (fileTypes[ext] || 0) + 1;
    });
    
    const expectedTypes = ['ts', 'tsx', 'js', 'jsx', 'md', 'json'];
    const foundTypes = Object.keys(fileTypes);
    
    console.log('   File types found:');
    Object.entries(fileTypes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([ext, count]) => {
        console.log(`      .${ext.padEnd(10)} : ${count} files`);
      });
    
    // Check if we have diverse file types
    if (foundTypes.length < 3) {
      this.warnings.push(`Low file type diversity: only ${foundTypes.length} types`);
      console.warn(`\n   ⚠️  Low diversity: only ${foundTypes.length} file types`);
    } else {
      this.passed.push(`Good file type diversity: ${foundTypes.length} types`);
      console.log(`\n   ✅ Good diversity: ${foundTypes.length} different file types`);
    }
    
    // Check if binary files are excluded
    const binaryExts = ['png', 'jpg', 'jpeg', 'gif', 'pdf', 'zip', 'exe'];
    const foundBinary = foundTypes.filter(ext => binaryExts.includes(ext));
    
    if (foundBinary.length > 0) {
      this.issues.push(`Binary files found: ${foundBinary.join(', ')}`);
      console.error(`   ❌ Binary files found: ${foundBinary.join(', ')}`);
    } else {
      this.passed.push('No binary files in index');
      console.log(`   ✅ No binary files (correctly filtered)`);
    }
  }

  async testContentQuality() {
    console.log('\n\n📝 Testing Content Quality...\n');
    
    const result = await apiRequest('/api/search', {
      method: 'POST',
      body: JSON.stringify({
        query: 'README documentation',
        limit: 10,
        threshold: 0.3
      })
    });
    
    if (result.count === 0) {
      this.warnings.push('No results for content quality check');
      console.warn('   ⚠️  No results to analyze');
      return;
    }
    
    let emptyContent = 0;
    let shortContent = 0;
    let goodContent = 0;
    let veryLongContent = 0;
    
    result.results.forEach(r => {
      const len = r.content.length;
      
      if (len === 0) emptyContent++;
      else if (len < 100) shortContent++;
      else if (len > 50000) veryLongContent++;
      else goodContent++;
    });
    
    console.log(`   Content length analysis:`);
    console.log(`      Empty (0 chars): ${emptyContent}`);
    console.log(`      Short (<100 chars): ${shortContent}`);
    console.log(`      Good (100-50000 chars): ${goodContent}`);
    console.log(`      Very long (>50000 chars): ${veryLongContent}`);
    
    if (emptyContent > 0) {
      this.issues.push(`${emptyContent} documents with empty content`);
      console.error(`\n   ❌ ${emptyContent} documents have empty content`);
    }
    
    if (shortContent > result.count / 2) {
      this.warnings.push(`${shortContent} documents with suspiciously short content`);
      console.warn(`   ⚠️  ${shortContent} documents are very short`);
    }
    
    if (goodContent > 0) {
      this.passed.push(`${goodContent} documents with good content length`);
      console.log(`\n   ✅ ${goodContent} documents have good content`);
    }
  }

  async testSimilarityScores() {
    console.log('\n\n🎯 Testing Similarity Scores...\n');
    
    // Test with exact query that should have high similarity
    const exactTest = await apiRequest('/api/search', {
      method: 'POST',
      body: JSON.stringify({
        query: 'authentication login password jwt token security',
        limit: 5,
        threshold: 0.1
      })
    });
    
    if (exactTest.count > 0) {
      const scores = exactTest.results.map(r => r.similarity);
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);
      
      console.log(`   Similarity score distribution:`);
      console.log(`      Average: ${avgScore.toFixed(3)}`);
      console.log(`      Max: ${maxScore.toFixed(3)}`);
      console.log(`      Min: ${minScore.toFixed(3)}`);
      
      if (avgScore < 0.3) {
        this.warnings.push(`Low average similarity: ${avgScore.toFixed(3)}`);
        console.warn(`\n   ⚠️  Average similarity is quite low`);
      } else {
        this.passed.push(`Good similarity scores: avg ${avgScore.toFixed(3)}`);
        console.log(`\n   ✅ Good similarity scores`);
      }
      
      // Check score ordering (should be descending)
      const ordered = scores.every((score, i) => i === 0 || score <= scores[i - 1]);
      if (ordered) {
        this.passed.push('Results properly ordered by similarity');
        console.log(`   ✅ Results properly ordered by similarity`);
      } else {
        this.issues.push('Results not ordered correctly');
        console.error(`   ❌ Results not properly ordered`);
      }
    }
  }

  printSummary() {
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 Data Integrity Test Summary\n');
    
    console.log(`✅ Passed Checks: ${this.passed.length}`);
    console.log(`⚠️  Warnings: ${this.warnings.length}`);
    console.log(`❌ Issues: ${this.issues.length}`);
    
    if (this.issues.length > 0) {
      console.log('\n❌ Issues Found:');
      this.issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach((warning, i) => {
        console.log(`   ${i + 1}. ${warning}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
    const healthScore = (this.passed.length / (this.passed.length + this.warnings.length + this.issues.length * 2)) * 100;
    console.log(`\n🏥 Data Health Score: ${healthScore.toFixed(0)}%`);
    
    if (healthScore >= 90) {
      console.log('✅ EXCELLENT - Data is healthy and consistent');
    } else if (healthScore >= 75) {
      console.log('✅ GOOD - Minor issues to address');
    } else if (healthScore >= 60) {
      console.log('⚠️  FAIR - Several issues need attention');
    } else {
      console.log('❌ POOR - Critical issues need immediate attention');
    }
  }
}

async function runDataIntegrityTests() {
  console.log('🔍 TekupVault Data Integrity & Consistency Tests');
  console.log('='.repeat(60));
  
  const tester = new DataIntegrityTest();
  
  try {
    await tester.testSyncStatus();
    await tester.testRepositoryConsistency();
    await tester.testDataTypes();
    await tester.testFileTypeDistribution();
    await tester.testContentQuality();
    await tester.testSimilarityScores();
    
    tester.printSummary();
    
  } catch (error) {
    console.error('\n❌ Data integrity test failed:', error.message);
    console.error(error.stack);
  }
}

runDataIntegrityTests().catch(console.error);

