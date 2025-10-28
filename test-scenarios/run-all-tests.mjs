/**
 * Master Test Runner
 * Kører alle test scenarier og genererer en samlet rapport
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tests = [
  {
    name: 'Search Quality Tests',
    file: '01-search-quality-test.mjs',
    description: 'Tests query relevance and result quality',
    critical: true
  },
  {
    name: 'Edge Cases & Error Handling',
    file: '02-edge-cases-test.mjs',
    description: 'Tests boundary conditions and error scenarios',
    critical: true
  },
  {
    name: 'Performance & Load Tests',
    file: '03-performance-test.mjs',
    description: 'Tests system performance under various loads',
    critical: false
  },
  {
    name: 'Data Integrity Tests',
    file: '04-data-integrity-test.mjs',
    description: 'Verifies data consistency and quality',
    critical: true
  }
];

function runTest(testFile) {
  return new Promise((resolve, reject) => {
    const testPath = join(__dirname, testFile);
    const startTime = Date.now();
    
    const child = spawn('node', [testPath], {
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      
      if (code === 0) {
        resolve({ success: true, duration });
      } else {
        resolve({ success: false, code, duration });
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function runAllTests() {
  console.log('🧪 TekupVault - Complete Test Suite');
  console.log('='.repeat(70));
  console.log('Running all test scenarios...\n');
  
  const results = [];
  
  for (const test of tests) {
    console.log('\n' + '='.repeat(70));
    console.log(`\n🚀 Running: ${test.name}`);
    console.log(`📝 ${test.description}`);
    console.log(`⚠️  Critical: ${test.critical ? 'Yes' : 'No'}\n`);
    console.log('='.repeat(70));
    
    try {
      const result = await runTest(test.file);
      results.push({
        ...test,
        ...result
      });
      
      const duration = (result.duration / 1000).toFixed(1);
      if (result.success) {
        console.log(`\n✅ ${test.name} completed successfully (${duration}s)\n`);
      } else {
        console.log(`\n❌ ${test.name} failed with code ${result.code} (${duration}s)\n`);
      }
      
      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`\n❌ ${test.name} crashed:`, error.message);
      results.push({
        ...test,
        success: false,
        error: error.message
      });
    }
  }
  
  // Print final summary
  printFinalSummary(results);
}

function printFinalSummary(results) {
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 FINAL TEST SUMMARY');
  console.log('='.repeat(70));
  
  const total = results.length;
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const criticalTests = results.filter(r => r.critical);
  const criticalPassed = criticalTests.filter(r => r.success).length;
  const criticalFailed = criticalTests.filter(r => !r.success).length;
  
  console.log('\n📈 Overall Results:');
  console.log(`   Total Tests: ${total}`);
  console.log(`   ✅ Passed: ${passed} (${((passed/total)*100).toFixed(0)}%)`);
  console.log(`   ❌ Failed: ${failed} (${((failed/total)*100).toFixed(0)}%)`);
  
  console.log('\n🔴 Critical Tests:');
  console.log(`   Total: ${criticalTests.length}`);
  console.log(`   ✅ Passed: ${criticalPassed}`);
  console.log(`   ❌ Failed: ${criticalFailed}`);
  
  console.log('\n📋 Test Results:\n');
  results.forEach((result, i) => {
    const status = result.success ? '✅' : '❌';
    const critical = result.critical ? '🔴' : '⚪';
    const duration = result.duration ? `(${(result.duration/1000).toFixed(1)}s)` : '';
    
    console.log(`${i + 1}. ${status} ${critical} ${result.name} ${duration}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  // Overall status
  console.log('\n' + '='.repeat(70));
  
  let overallStatus;
  let statusMessage;
  
  if (criticalFailed === 0 && failed === 0) {
    overallStatus = 'EXCELLENT';
    statusMessage = '✅ All tests passed! System is production ready.';
  } else if (criticalFailed === 0 && failed <= 1) {
    overallStatus = 'GOOD';
    statusMessage = '✅ Critical tests passed. Minor issues to address.';
  } else if (criticalFailed === 0) {
    overallStatus = 'ACCEPTABLE';
    statusMessage = '⚠️  Critical tests passed but several non-critical failures.';
  } else if (criticalFailed === 1) {
    overallStatus = 'NEEDS ATTENTION';
    statusMessage = '❌ One critical test failed. Requires investigation.';
  } else {
    overallStatus = 'CRITICAL ISSUES';
    statusMessage = '❌ Multiple critical tests failed. Immediate action required.';
  }
  
  console.log(`\n🎯 Overall Status: ${overallStatus}`);
  console.log(`   ${statusMessage}`);
  
  // Recommendations
  console.log('\n💡 Recommendations:\n');
  
  const failedTests = results.filter(r => !r.success);
  if (failedTests.length > 0) {
    console.log('   Failed tests to investigate:');
    failedTests.forEach(test => {
      console.log(`   - ${test.name} ${test.critical ? '(CRITICAL)' : ''}`);
    });
  } else {
    console.log('   - Continue monitoring system performance');
    console.log('   - Run tests periodically to catch regressions');
    console.log('   - Consider adding more edge case tests');
  }
  
  console.log('\n' + '='.repeat(70));
  
  // Exit code based on critical tests
  if (criticalFailed > 0) {
    console.log('\n❌ Exiting with error due to critical test failures\n');
    process.exit(1);
  } else {
    console.log('\n✅ All critical tests passed\n');
    process.exit(0);
  }
}

// Run all tests
runAllTests().catch(error => {
  console.error('\n❌ Test runner crashed:', error);
  process.exit(1);
});

