# TekupVault Monitoring & Alerting

## Health Monitoring Script

### Usage

```powershell
# Basic health check
.\scripts\health-monitor.ps1

# Verbose output with logs
.\scripts\health-monitor.ps1 -Verbose

# Custom API URL
.\scripts\health-monitor.ps1 -ApiUrl "https://tekupvault.yourdomain.com"
```

### What It Checks

- ✅ Docker containers running
- ✅ API health endpoint
- ✅ Database connectivity & query performance
- ✅ Worker sync status
- ✅ Resource usage (CPU & Memory)
- ✅ Recent errors in logs

### Scheduled Monitoring

**Windows Task Scheduler:**

```powershell
# Run every 15 minutes
$action = New-ScheduledTaskAction -Execute "pwsh.exe" -Argument "-File C:\Users\empir\tekup-vault\scripts\health-monitor.ps1"
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 15)
Register-ScheduledTask -TaskName "TekupVault Health Monitor" -Action $action -Trigger $trigger
```

**Linux Cron:**

```bash
# Run every 15 minutes
*/15 * * * * /usr/bin/pwsh /path/to/tekup-vault/scripts/health-monitor.ps1 >> /var/log/tekupvault-health.log 2>&1
```

## Metrics Endpoints

### Built-in Metrics

API health endpoint includes basic metrics:

```bash
curl http://localhost:3000/health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2025-10-28T23:31:37.150Z",
  "service": "vault-api"
}
```

### Custom Metrics (To Add)

Edit `apps/vault-api/src/routes/health.ts` to add:

```typescript
router.get("/metrics", (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    // Add custom metrics:
    totalDocuments: documentCount,
    totalEmbeddings: embeddingCount,
    lastSyncTime: lastSyncTimestamp,
  });
});
```

## Prometheus Integration (Future)

### docker-compose.yml Addition

```yaml
prometheus:
  image: prom/prometheus
  ports:
    - "9090:9090"
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
```

### prometheus.yml

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "tekupvault"
    static_configs:
      - targets: ["api:3000"]
```

## Grafana Dashboards (Future)

### Metrics to Track

- API response times
- Search query latency
- Document sync rate
- Embedding generation rate
- Error rates
- Resource usage trends

## Alert Rules

### Critical Alerts (Immediate Action)

- 🚨 API down for >2 minutes
- 🚨 Database connection lost
- 🚨 Worker crashed
- 🚨 Disk space <10%

### Warning Alerts (Review Soon)

- ⚠️ API response time >500ms
- ⚠️ Memory usage >80%
- ⚠️ Error rate >1%
- ⚠️ No sync in 7 hours

### Info Alerts (Good to Know)

- ℹ️ New documents indexed
- ℹ️ Sync completed successfully
- ℹ️ Container restart detected

## Log Aggregation

### Current: Docker Logs

```bash
# View API logs
docker logs tekupvault-api -f

# View Worker logs
docker logs tekupvault-worker -f

# Search for errors
docker logs tekupvault-api 2>&1 | grep -i error
```

### Future: Centralized Logging

Consider:

- **Loki + Grafana** (lightweight)
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Cloud Services** (Datadog, New Relic, Papertrail)

## Performance Monitoring

### Key Performance Indicators (KPIs)

1. **API Performance**
   - Average response time: <200ms target
   - 95th percentile: <500ms
   - Error rate: <0.1%

2. **Search Quality**
   - Query accuracy (semantic similarity >0.7)
   - Result relevance
   - Search time: <300ms

3. **Sync Reliability**
   - Success rate: >99%
   - Documents synced per hour
   - Failed file count: <1%

## Quick Commands

```bash
# Check all container health
docker ps --filter "name=tekupvault"

# Quick API test
curl http://localhost:3000/health

# Check resource usage
docker stats tekupvault-api tekupvault-worker --no-stream

# View recent errors
docker logs tekupvault-api 2>&1 | tail -50 | grep -i error

# Restart unhealthy service
docker-compose restart tekupvault-api

# Full system restart
docker-compose down && docker-compose up -d
```

## Troubleshooting

### API Not Responding

1. Check container status: `docker ps`
2. Check logs: `docker logs tekupvault-api --tail 50`
3. Verify .env configuration
4. Test database connection
5. Restart: `docker-compose restart tekupvault-api`

### Worker Not Syncing

1. Check logs: `docker logs tekupvault-worker --tail 50`
2. Verify GITHUB_TOKEN (if GitHub sync enabled)
3. Check workspace mount: `/workspace` accessible?
4. Verify database connection
5. Force restart: `docker-compose restart tekupvault-worker`

### High Memory Usage

1. Check document count in database
2. Review embedding cache size
3. Consider increasing container memory limit
4. Monitor for memory leaks in logs

### Slow Search Queries

1. Check database indexes exist
2. Review query complexity
3. Monitor embedding generation time
4. Consider adding caching layer
