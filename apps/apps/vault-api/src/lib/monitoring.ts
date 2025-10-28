/**
 * Monitoring and metrics for TekupVault
 * Tracks API usage, cache performance, search metrics, and sync health
 */

import { Logger } from 'pino';

export interface MetricsData {
  // API metrics
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  
  // Search metrics
  totalSearches: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  averageResultCount: number;
  
  // Repository metrics
  totalRepositories: number;
  syncedRepositories: number;
  failedSyncs: number;
  
  // Database metrics
  totalDocuments: number;
  totalEmbeddings: number;
  
  // Timestamps
  startTime: Date;
  uptime: number; // seconds
}

export class MonitoringService {
  private logger: Logger;
  private metrics: MetricsData;
  private startTime: Date;
  private responseTimes: number[] = [];
  private resultCounts: number[] = [];

  constructor(logger: Logger) {
    this.logger = logger;
    this.startTime = new Date();
    
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalSearches: 0,
      cacheHits: 0,
      cacheMisses: 0,
      cacheHitRate: 0,
      averageResultCount: 0,
      totalRepositories: 0,
      syncedRepositories: 0,
      failedSyncs: 0,
      totalDocuments: 0,
      totalEmbeddings: 0,
      startTime: this.startTime,
      uptime: 0
    };
  }

  /**
   * Track API request
   */
  trackRequest(success: boolean, responseTime: number): void {
    this.metrics.totalRequests++;
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    
    this.responseTimes.push(responseTime);
    
    // Keep only last 1000 response times
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }
    
    // Update average
    this.metrics.averageResponseTime = 
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
  }

  /**
   * Track search operation
   */
  trackSearch(resultCount: number, fromCache: boolean): void {
    this.metrics.totalSearches++;
    
    if (fromCache) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
    
    const totalCacheOps = this.metrics.cacheHits + this.metrics.cacheMisses;
    this.metrics.cacheHitRate = totalCacheOps > 0 
      ? (this.metrics.cacheHits / totalCacheOps) * 100 
      : 0;
    
    this.resultCounts.push(resultCount);
    
    // Keep only last 1000 result counts
    if (this.resultCounts.length > 1000) {
      this.resultCounts.shift();
    }
    
    // Update average
    this.metrics.averageResultCount = 
      this.resultCounts.reduce((sum, count) => sum + count, 0) / this.resultCounts.length;
  }

  /**
   * Update repository metrics
   */
  updateRepositoryMetrics(
    total: number,
    synced: number,
    failed: number
  ): void {
    this.metrics.totalRepositories = total;
    this.metrics.syncedRepositories = synced;
    this.metrics.failedSyncs = failed;
  }

  /**
   * Update database metrics
   */
  updateDatabaseMetrics(
    totalDocuments: number,
    totalEmbeddings: number
  ): void {
    this.metrics.totalDocuments = totalDocuments;
    this.metrics.totalEmbeddings = totalEmbeddings;
  }

  /**
   * Get current metrics
   */
  getMetrics(): MetricsData {
    const now = new Date();
    const uptime = Math.floor((now.getTime() - this.startTime.getTime()) / 1000);
    
    return {
      ...this.metrics,
      uptime
    };
  }

  /**
   * Get metrics summary for logging
   */
  getSummary(): string {
    const metrics = this.getMetrics();
    
    return `
Metrics Summary:
  Uptime: ${metrics.uptime}s
  API: ${metrics.successfulRequests}/${metrics.totalRequests} success (${metrics.failedRequests} failed)
  Avg Response: ${metrics.averageResponseTime.toFixed(2)}ms
  Searches: ${metrics.totalSearches} (Cache Hit: ${metrics.cacheHitRate.toFixed(1)}%)
  Avg Results: ${metrics.averageResultCount.toFixed(1)}
  Repositories: ${metrics.syncedRepositories}/${metrics.totalRepositories} synced
  Documents: ${metrics.totalDocuments} (${metrics.totalEmbeddings} embedded)
    `.trim();
  }

  /**
   * Log metrics periodically
   */
  startPeriodicLogging(intervalMinutes: number = 15): NodeJS.Timeout {
    const intervalMs = intervalMinutes * 60 * 1000;
    
    return setInterval(() => {
      const summary = this.getSummary();
      this.logger.info({ metrics: this.getMetrics() }, summary);
    }, intervalMs);
  }

  /**
   * Reset metrics (useful for testing)
   */
  reset(): void {
    this.startTime = new Date();
    this.responseTimes = [];
    this.resultCounts = [];
    
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalSearches: 0,
      cacheHits: 0,
      cacheMisses: 0,
      cacheHitRate: 0,
      averageResultCount: 0,
      totalRepositories: 0,
      syncedRepositories: 0,
      failedSyncs: 0,
      totalDocuments: 0,
      totalEmbeddings: 0,
      startTime: this.startTime,
      uptime: 0
    };
  }
}

/**
 * Middleware to track request metrics
 */
export function createMetricsMiddleware(monitoring: MonitoringService) {
  return (_req: any, res: any, next: any) => {
    const startTime = Date.now();
    
    // Track response
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      const success = res.statusCode < 400;
      monitoring.trackRequest(success, responseTime);
    });
    
    next();
  };
}
