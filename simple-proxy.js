#!/usr/bin/env node

const http = require('http');
const https = require('https');

const PORT = 3001;

console.log('Starting simple proxy server...');

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // Simple health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Proxy server is running');
    return;
  }
  
  // Simple test response for now
  res.writeHead(200, { 
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*'
  });
  res.write('data: {"jsonrpc":"2.0","method":"initialized","params":{}}\n\n');
  
  // Keep connection open for a few seconds
  setTimeout(() => {
    res.end();
  }, 2000);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Simple proxy server running at http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});