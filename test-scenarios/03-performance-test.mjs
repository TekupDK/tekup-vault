/**
 * Test Scenario 3: Performance & Load Testing
 * Tests systemets ydeevne under forskellige belastninger
 */

const API_URL = 'http://localhost:3001';
const API_KEY = 'tekup_vault_api_key_2025_secure';

class PerformanceTest {
  constructor() {
    this.results = [];
  }

  async measureRequest(name, fn) {
    const startTime = Date.now();
    const startMem = process.memoryUsage().heapUsed;
    
    try {
      const result = await fn();
      const endTime = Date.now();
      const endMem = process.memoryUsage().heapUsed;
      
      const duration = endTime - startTime;
      const memoryDelta = endMem - startMem;
      
      this.results.push({
        name,
        success: true,
        duration,
        memoryDelta,
        result
      });
      
      return { success: true, duration, result };
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.results.push({
        name,
        success: false,
        duration,
        error: error.message
      });
      
      return { success: false, duration, error: error.message };
    }
  }

  async searchRequest(query, limit = 10, threshold = 0.5) {
    const response = await fetch(`${API_URL}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({ query, limit, threshold })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }

  async runSequentialTests() {
    console.log('\n📊 Sequential Request Tests\n');
    console.log('Testing response times for individual queries...\n');
    
    const queries = [
      'authentication',
      'React component validation',
      'database schema prisma',
      'API integration Billy',
      'error handling logger'
    ];
    
    for (const query of queries) {
      const result = await this.measureRequest(
        `Query: "${query.substring(0, 30)}..."`,
        () => this.searchRequest(query)
      );
      
      const status = result.success ? '✅' : '❌';
      const time = result.duration;
      const count = result.result?.count || 0;
      
      console.log(`${status} ${time}ms - ${count} results - ${query}`);
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const times = this.results.map(r => r.duration);
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);
    
    console.log(`\n📈 Statistics:`);
    console.log(`   Average: ${avgTime.toFixed(0)}ms`);
    console.log(`   Min: ${minTime}ms`);
    console.log(`   Max: ${maxTime}ms`);
    
    return { avgTime, maxTime, minTime };
  }

  async runConcurrentTests() {
    console.log('\n\n⚡ Concurrent Request Tests\n');
    console.log('Testing parallel request handling...\n');
    
    const concurrentLevels = [2, 5, 10, 20];
    const concurrentResults = [];
    
    for (const level of concurrentLevels) {
      console.log(`Testing ${level} concurrent requests...`);
      
      const promises = Array(level).fill(0).map((_, i) => 
        this.measureRequest(
          `Concurrent ${level} - Request ${i + 1}`,
          () => this.searchRequest('authentication test query ' + i)
        )
      );
      
      const startTime = Date.now();
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      const successful = results.filter(r => r.success).length;
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      
      concurrentResults.push({
        level,
        totalTime,
        avgDuration,
        successful,
        failed: level - successful
      });
      
      console.log(`   ✅ ${successful}/${level} succeeded`);
      console.log(`   ⏱️  Total time: ${totalTime}ms`);
      console.log(`   📊 Avg per request: ${avgDuration.toFixed(0)}ms\n`);
      
      // Wait between concurrency tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return concurrentResults;
  }

  async runLargeLimitTest() {
    console.log('\n📦 Large Result Set Tests\n');
    console.log('Testing with different result limits...\n');
    
    const limits = [1, 5, 10, 50, 100];
    const largeLimitResults = [];
    
    for (const limit of limits) {
      const result = await this.measureRequest(
        `Limit ${limit}`,
        () => this.searchRequest('documentation guide', limit, 0.1)
      );
      
      const time = result.duration;
      const count = result.result?.count || 0;
      
      largeLimitResults.push({ limit, time, count });
      
      console.log(`   Limit ${limit.toString().padStart(3)}: ${time.toString().padStart(4)}ms - ${count} results`);
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return largeLimitResults;
  }

  async runCacheTest() {
    console.log('\n\n💾 Cache Performance Test\n');
    console.log('Testing same query multiple times...\n');
    
    const query = 'authentication backend testing';
    
    // First request (cold)
    console.log('1st request (cold):');
    const cold = await this.measureRequest(
      'Cache Test - Cold',
      () => this.searchRequest(query)
    );
    console.log(`   ⏱️  ${cold.duration}ms\n`);
    
    // Subsequent requests (potentially warm)
    const warmTimes = [];
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const warm = await this.measureRequest(
        `Cache Test - Warm ${i + 1}`,
        () => this.searchRequest(query)
      );
      warmTimes.push(warm.duration);
      console.log(`${i + 2}${i === 0 ? 'nd' : i === 1 ? 'rd' : 'th'} request: ${warm.duration}ms`);
    }
    
    const avgWarm = warmTimes.reduce((a, b) => a + b, 0) / warmTimes.length;
    const improvement = ((cold.duration - avgWarm) / cold.duration * 100).toFixed(1);
    
    console.log(`\n📊 Cache Analysis:`);
    console.log(`   Cold: ${cold.duration}ms`);
    console.log(`   Warm avg: ${avgWarm.toFixed(0)}ms`);
    console.log(`   Improvement: ${improvement}%`);
    
    return { cold: cold.duration, warm: avgWarm, improvement };
  }

  async runStressTest() {
    console.log('\n\n🔥 Stress Test\n');
    console.log('Rapid-fire requests for 10 seconds...\n');
    
    const duration = 10000; // 10 seconds
    const startTime = Date.now();
    let requestCount = 0;
    let successCount = 0;
    let errorCount = 0;
    const responseTimes = [];
    
    while (Date.now() - startTime < duration) {
      try {
        const reqStart = Date.now();
        const result = await this.searchRequest(`stress test ${requestCount}`, 5);
        const reqTime = Date.now() - reqStart;
        
        responseTimes.push(reqTime);
        requestCount++;
        
        if (result.success !== false) {
          successCount++;
        } else {
          errorCount++;
        }
        
        // Show progress every 10 requests
        if (requestCount % 10 === 0) {
          process.stdout.write(`\r   Requests: ${requestCount}, Success: ${successCount}, Errors: ${errorCount}`);
        }
        
      } catch (error) {
        errorCount++;
        requestCount++;
      }
      
      // Small delay to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log('\n');
    
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);
    const requestsPerSecond = (requestCount / (duration / 1000)).toFixed(2);
    
    console.log(`📊 Stress Test Results:`);
    console.log(`   Total requests: ${requestCount}`);
    console.log(`   Successful: ${successCount} (${((successCount/requestCount)*100).toFixed(1)}%)`);
    console.log(`   Failed: ${errorCount} (${((errorCount/requestCount)*100).toFixed(1)}%)`);
    console.log(`   Requests/sec: ${requestsPerSecond}`);
    console.log(`   Avg response: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`   Min response: ${minResponseTime}ms`);
    console.log(`   Max response: ${maxResponseTime}ms`);
    
    return {
      totalRequests: requestCount,
      successCount,
      errorCount,
      requestsPerSecond: parseFloat(requestsPerSecond),
      avgResponseTime,
      maxResponseTime,
      minResponseTime
    };
  }

  printSummary() {
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 Performance Test Summary\n');
    
    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length;
    const maxDuration = Math.max(...this.results.map(r => r.duration));
    
    console.log(`Total Requests: ${this.results.length}`);
    console.log(`✅ Successful: ${successful} (${((successful/this.results.length)*100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${failed} (${((failed/this.results.length)*100).toFixed(1)}%)`);
    console.log(`⏱️  Average Time: ${avgDuration.toFixed(0)}ms`);
    console.log(`⏱️  Max Time: ${maxDuration}ms`);
    
    // Performance grading
    const grade = avgDuration < 500 ? 'A' : 
                  avgDuration < 1000 ? 'B' :
                  avgDuration < 2000 ? 'C' : 'D';
    
    console.log(`\n🎯 Performance Grade: ${grade}`);
    
    if (grade === 'A') console.log('   Excellent performance! 🚀');
    else if (grade === 'B') console.log('   Good performance ✅');
    else if (grade === 'C') console.log('   Acceptable but could be improved ⚠️');
    else console.log('   Needs optimization ❌');
    
    console.log('\n' + '='.repeat(60));
  }
}

async function runAllPerformanceTests() {
  console.log('🚀 TekupVault Performance & Load Tests');
  console.log('='.repeat(60));
  
  const tester = new PerformanceTest();
  
  try {
    // Run all test suites
    await tester.runSequentialTests();
    await tester.runConcurrentTests();
    await tester.runLargeLimitTest();
    await tester.runCacheTest();
    await tester.runStressTest();
    
    // Print summary
    tester.printSummary();
    
  } catch (error) {
    console.error('\n❌ Performance test failed:', error.message);
    console.error(error.stack);
  }
}

runAllPerformanceTests().catch(console.error);

