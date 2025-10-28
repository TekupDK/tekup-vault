/**
 * Tests for monitoring service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MonitoringService } from '../lib/monitoring';
import pino from 'pino';

const mockLogger = pino({ level: 'silent' });

describe('MonitoringService', () => {
  let monitoring: MonitoringService;

  beforeEach(() => {
    monitoring = new MonitoringService(mockLogger);
  });

  describe('request tracking', () => {
    it('should track successful requests', () => {
      monitoring.trackRequest(true, 100);
      monitoring.trackRequest(true, 150);

      const metrics = monitoring.getMetrics();
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.successfulRequests).toBe(2);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
    });

    it('should track failed requests', () => {
      monitoring.trackRequest(false, 500);

      const metrics = monitoring.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(1);
    });

    it('should calculate average response time correctly', () => {
      monitoring.trackRequest(true, 100);
      monitoring.trackRequest(true, 200);
      monitoring.trackRequest(true, 300);

      const metrics = monitoring.getMetrics();
      expect(metrics.averageResponseTime).toBe(200);
    });
  });

  describe('search tracking', () => {
    it('should track cache hits and misses', () => {
      monitoring.trackSearch(10, true);  // cache hit
      monitoring.trackSearch(5, false);  // cache miss
      monitoring.trackSearch(8, true);   // cache hit

      const metrics = monitoring.getMetrics();
      expect(metrics.totalSearches).toBe(3);
      expect(metrics.cacheHits).toBe(2);
      expect(metrics.cacheMisses).toBe(1);
      expect(metrics.cacheHitRate).toBeCloseTo(66.67, 1);
    });

    it('should calculate average result count', () => {
      monitoring.trackSearch(10, false);
      monitoring.trackSearch(20, false);
      monitoring.trackSearch(30, false);

      const metrics = monitoring.getMetrics();
      expect(metrics.averageResultCount).toBe(20);
    });

    it('should handle zero cache operations', () => {
      const metrics = monitoring.getMetrics();
      expect(metrics.cacheHitRate).toBe(0);
    });
  });

  describe('repository metrics', () => {
    it('should update repository metrics', () => {
      monitoring.updateRepositoryMetrics(10, 8, 2);

      const metrics = monitoring.getMetrics();
      expect(metrics.totalRepositories).toBe(10);
      expect(metrics.syncedRepositories).toBe(8);
      expect(metrics.failedSyncs).toBe(2);
    });
  });

  describe('database metrics', () => {
    it('should update database metrics', () => {
      monitoring.updateDatabaseMetrics(1000, 950);

      const metrics = monitoring.getMetrics();
      expect(metrics.totalDocuments).toBe(1000);
      expect(metrics.totalEmbeddings).toBe(950);
    });
  });

  describe('uptime', () => {
    it('should track uptime', (done) => {
      setTimeout(() => {
        const metrics = monitoring.getMetrics();
        expect(metrics.uptime).toBeGreaterThan(0);
        done();
      }, 100);
    });
  });

  describe('summary', () => {
    it('should generate readable summary', () => {
      monitoring.trackRequest(true, 100);
      monitoring.trackSearch(10, true);
      monitoring.updateRepositoryMetrics(5, 4, 1);
      monitoring.updateDatabaseMetrics(100, 95);

      const summary = monitoring.getSummary();
      expect(summary).toContain('Uptime:');
      expect(summary).toContain('API:');
      expect(summary).toContain('Searches:');
      expect(summary).toContain('Repositories:');
      expect(summary).toContain('Documents:');
    });
  });

  describe('reset', () => {
    it('should reset all metrics', () => {
      monitoring.trackRequest(true, 100);
      monitoring.trackSearch(10, true);
      monitoring.updateRepositoryMetrics(5, 4, 1);

      monitoring.reset();

      const metrics = monitoring.getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.totalSearches).toBe(0);
      expect(metrics.totalRepositories).toBe(0);
    });
  });
});
