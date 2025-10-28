#!/usr/bin/env node

/**
 * MCP Diagnostics Test
 * Tests MCP endpoints to identify exact error
 */

const BASE_URL = 'https://tekupvault.onrender.com';

async function testEndpoint(name, url, options = {}) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`   URL: ${url}`);
  
  try {
    const response = await fetch(url, options);
    const text = await response.text();
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Headers:`, Object.fromEntries(response.headers.entries()));
    
    try {
      const json = JSON.parse(text);
      console.log(`   Response:`, JSON.stringify(json, null, 2));
    } catch {
      console.log(`   Response (raw):`, text);
    }
    
    return { success: response.ok, data: text };
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🔍 TekupVault MCP Diagnostics\n');
  console.log('=' + repeat('=', 50));
  
  // Test 1: Health Check
  await testEndpoint(
    'Health Check',
    `${BASE_URL}/health`
  );
  
  // Test 2: MCP Discovery
  await testEndpoint(
    'MCP Discovery',
    `${BASE_URL}/.well-known/mcp.json`
  );
  
  // Test 3: MCP Initialize (2024-11-05)
  await testEndpoint(
    'MCP Initialize (2024-11-05)',
    `${BASE_URL}/mcp`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'diagnostic-test',
            version: '1.0.0'
          }
        },
        id: 1
      })
    }
  );
  
  // Test 4: MCP Initialize (2025-03-26)
  await testEndpoint(
    'MCP Initialize (2025-03-26)',
    `${BASE_URL}/mcp`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: {
            name: 'diagnostic-test',
            version: '1.0.0'
          }
        },
        id: 2
      })
    }
  );
  
  // Test 5: MCP Tools List (without initialize - should fail gracefully)
  await testEndpoint(
    'MCP Tools/List (no session)',
    `${BASE_URL}/mcp`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: 3
      })
    }
  );
  
  // Test 6: Invalid MCP Method
  await testEndpoint(
    'Invalid MCP Method',
    `${BASE_URL}/mcp`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'invalid_method',
        params: {},
        id: 4
      })
    }
  );
  
  console.log('\n' + '='.repeat(50));
  console.log('\n✅ Diagnostics complete!');
}

function repeat(str, n) {
  return Array(n).fill(str).join('');
}

main().catch(console.error);

