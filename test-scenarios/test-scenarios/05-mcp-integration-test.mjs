#!/usr/bin/env node

/**
 * Test Scenario 05: MCP Integration Test
 * 
 * Tests the MCP HTTP server endpoints and tool functionality
 */

// Use native fetch (Node.js 18+)
const fetch = globalThis.fetch;

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name) {
  console.log(`\n${colors.blue}▶ Test: ${name}${colors.reset}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function logError(message) {
  console.log(`${colors.red}✗ ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠ ${message}${colors.reset}`);
}

let testsPassed = 0;
let testsFailed = 0;
let testsWarning = 0;

/**
 * Test 1: MCP Discovery Endpoint
 */
async function testMcpDiscovery() {
  logTest('MCP Discovery Endpoint');
  
  try {
    const response = await fetch(`${API_BASE}/.well-known/mcp.json`);
    const data = await response.json();
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    // Validate structure
    if (!data.version || !data.name || !data.endpoints || !data.capabilities) {
      throw new Error('Missing required fields in discovery response');
    }
    
    if (data.version !== '2025-03-26') {
      logWarning(`MCP version is ${data.version}, expected 2025-03-26`);
      testsWarning++;
    }
    
    if (!data.capabilities.tools) {
      throw new Error('Tools capability should be enabled');
    }
    
    logSuccess(`Discovery endpoint working (${data.name})`);
    logSuccess(`Protocol version: ${data.version}`);
    logSuccess(`Capabilities: tools=${data.capabilities.tools}`);
    testsPassed++;
    
  } catch (error) {
    logError(`Discovery test failed: ${error.message}`);
    testsFailed++;
  }
}

/**
 * Test 2: MCP Initialize Request
 */
async function testMcpInitialize() {
  logTest('MCP Initialize Request');
  
  try {
    const response = await fetch(`${API_BASE}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          clientInfo: {
            name: 'test-client',
            version: '1.0.0'
          }
        },
        id: 1
      })
    });
    
    const data = await response.json();
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (data.jsonrpc !== '2.0') {
      throw new Error('Response should be JSON-RPC 2.0');
    }
    
    if (!data.result || !data.result.serverInfo) {
      throw new Error('Missing serverInfo in initialize response');
    }
    
    const sessionId = response.headers.get('mcp-session-id');
    if (!sessionId) {
      logWarning('No Mcp-Session-Id header returned');
      testsWarning++;
    } else {
      logSuccess(`Session created: ${sessionId}`);
    }
    
    logSuccess(`Initialize successful: ${data.result.serverInfo.name}`);
    logSuccess(`Protocol version: ${data.result.protocolVersion}`);
    testsPassed++;
    
    return sessionId;
    
  } catch (error) {
    logError(`Initialize test failed: ${error.message}`);
    testsFailed++;
    return null;
  }
}

/**
 * Test 3: List Tools
 */
async function testListTools(sessionId) {
  logTest('List Tools Request');
  
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (sessionId) {
      headers['Mcp-Session-Id'] = sessionId;
    }
    
    const response = await fetch(`${API_BASE}/mcp`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: 2
      })
    });
    
    const data = await response.json();
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!data.result || !data.result.tools) {
      throw new Error('Missing tools in response');
    }
    
    const tools = data.result.tools;
    const expectedTools = ['search_knowledge', 'get_sync_status', 'list_repositories', 'get_repository_info'];
    
    for (const toolName of expectedTools) {
      const tool = tools.find(t => t.name === toolName);
      if (!tool) {
        throw new Error(`Tool ${toolName} not found in tools list`);
      }
      logSuccess(`Found tool: ${tool.name} - ${tool.description.slice(0, 50)}...`);
    }
    
    logSuccess(`Total tools: ${tools.length}`);
    testsPassed++;
    
  } catch (error) {
    logError(`List tools test failed: ${error.message}`);
    testsFailed++;
  }
}

/**
 * Test 4: Call search_knowledge Tool
 */
async function testSearchKnowledgeTool(sessionId) {
  logTest('Call search_knowledge Tool');
  
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (sessionId) {
      headers['Mcp-Session-Id'] = sessionId;
    }
    
    const response = await fetch(`${API_BASE}/mcp`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'search_knowledge',
          arguments: {
            query: 'How to deploy to Render.com',
            limit: 3,
            threshold: 0.5
          }
        },
        id: 3
      })
    });
    
    const data = await response.json();
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (data.error) {
      // Check if error is due to no embeddings yet
      if (data.error.message.includes('Search failed') || data.error.message.includes('no rows')) {
        logWarning('No search results - embeddings may not be generated yet');
        logWarning('Run the worker to generate embeddings: pnpm --filter @tekupvault/vault-worker start');
        testsWarning++;
        return;
      }
      throw new Error(`Tool call returned error: ${data.error.message}`);
    }
    
    if (!data.result || !data.result.content) {
      throw new Error('Missing content in tool call response');
    }
    
    const content = data.result.content[0];
    if (content.type !== 'text') {
      throw new Error('Expected content type to be text');
    }
    
    const result = JSON.parse(content.text);
    
    if (!result.success) {
      throw new Error(`Tool call not successful: ${JSON.stringify(result)}`);
    }
    
    logSuccess(`Search successful: ${result.count} results found`);
    logSuccess(`Query: "${result.query}"`);
    
    if (result.results && result.results.length > 0) {
      const firstResult = result.results[0];
      logSuccess(`Top result: ${firstResult.repository}/${firstResult.path} (similarity: ${firstResult.similarity.toFixed(2)})`);
    }
    
    testsPassed++;
    
  } catch (error) {
    logError(`search_knowledge tool test failed: ${error.message}`);
    testsFailed++;
  }
}

/**
 * Test 5: Call get_sync_status Tool
 */
async function testGetSyncStatusTool(sessionId) {
  logTest('Call get_sync_status Tool');
  
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (sessionId) {
      headers['Mcp-Session-Id'] = sessionId;
    }
    
    const response = await fetch(`${API_BASE}/mcp`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'get_sync_status',
          arguments: {}
        },
        id: 4
      })
    });
    
    const data = await response.json();
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (data.error) {
      throw new Error(`Tool call returned error: ${data.error.message}`);
    }
    
    const content = data.result.content[0];
    const result = JSON.parse(content.text);
    
    if (!result.success) {
      throw new Error('Tool call not successful');
    }
    
    logSuccess(`Sync status retrieved: ${result.totalRepositories} repositories`);
    logSuccess(`Total documents: ${result.totalDocuments}`);
    
    if (result.repositories && result.repositories.length > 0) {
      const firstRepo = result.repositories[0];
      logSuccess(`First repo: ${firstRepo.repository} (${firstRepo.documentCount} docs, status: ${firstRepo.status})`);
    }
    
    testsPassed++;
    
  } catch (error) {
    logError(`get_sync_status tool test failed: ${error.message}`);
    testsFailed++;
  }
}

/**
 * Test 6: Call list_repositories Tool
 */
async function testListRepositoriesTool(sessionId) {
  logTest('Call list_repositories Tool');
  
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (sessionId) {
      headers['Mcp-Session-Id'] = sessionId;
    }
    
    const response = await fetch(`${API_BASE}/mcp`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'list_repositories',
          arguments: {}
        },
        id: 5
      })
    });
    
    const data = await response.json();
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (data.error) {
      throw new Error(`Tool call returned error: ${data.error.message}`);
    }
    
    const content = data.result.content[0];
    const result = JSON.parse(content.text);
    
    if (!result.success) {
      throw new Error('Tool call not successful');
    }
    
    logSuccess(`Repositories listed: ${result.count} repositories`);
    
    if (result.repositories && result.repositories.length > 0) {
      result.repositories.forEach(repo => {
        logSuccess(`  - ${repo.fullName} (${repo.owner}/${repo.repo})`);
      });
    }
    
    testsPassed++;
    
  } catch (error) {
    logError(`list_repositories tool test failed: ${error.message}`);
    testsFailed++;
  }
}

/**
 * Test 7: Error Handling - Invalid Tool
 */
async function testInvalidTool(sessionId) {
  logTest('Error Handling - Invalid Tool');
  
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (sessionId) {
      headers['Mcp-Session-Id'] = sessionId;
    }
    
    const response = await fetch(`${API_BASE}/mcp`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'nonexistent_tool',
          arguments: {}
        },
        id: 6
      })
    });
    
    const data = await response.json();
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!data.error) {
      throw new Error('Expected error response for invalid tool');
    }
    
    if (data.error.code !== -32603) {
      logWarning(`Expected error code -32603, got ${data.error.code}`);
      testsWarning++;
    }
    
    logSuccess(`Error handling working: ${data.error.message}`);
    testsPassed++;
    
  } catch (error) {
    logError(`Invalid tool test failed: ${error.message}`);
    testsFailed++;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  log('\n========================================', 'cyan');
  log('Test Scenario 05: MCP Integration Test', 'cyan');
  log('========================================\n', 'cyan');
  
  // Test discovery
  await testMcpDiscovery();
  
  // Initialize session
  const sessionId = await testMcpInitialize();
  
  // Test tool listing
  await testListTools(sessionId);
  
  // Test individual tools
  await testSearchKnowledgeTool(sessionId);
  await testGetSyncStatusTool(sessionId);
  await testListRepositoriesTool(sessionId);
  
  // Test error handling
  await testInvalidTool(sessionId);
  
  // Summary
  log('\n========================================', 'cyan');
  log('Test Summary', 'cyan');
  log('========================================', 'cyan');
  log(`✓ Passed: ${testsPassed}`, 'green');
  if (testsFailed > 0) {
    log(`✗ Failed: ${testsFailed}`, 'red');
  }
  if (testsWarning > 0) {
    log(`⚠ Warnings: ${testsWarning}`, 'yellow');
  }
  log('========================================\n', 'cyan');
  
  // Exit code
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  logError(`Test runner failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});

