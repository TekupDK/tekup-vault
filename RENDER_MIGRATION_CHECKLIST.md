# TekupVault Render Migration - Quick Checklist

**Dato**: 27. Oktober 2025

---

## ✅ Pre-Migration Checklist

- [ ] Backup eksisterende Render environment variables
- [ ] Notér nuværende API endpoint URL
- [ ] Verificér at `TekupDK/tekup` repo er tilgængeligt
- [ ] Confirm at kode er på `master` branch

---

## 🚀 Migration Steps

### 1. tekupvault-api Service

- [ ] Login til Render Dashboard
- [ ] Navigate til `tekupvault-api` service
- [ ] Gå til Settings
- [ ] Disconnect gammelt repository
- [ ] Connect til `TekupDK/tekup`
- [ ] Set Root Directory: `apps/production/tekup-vault`
- [ ] Set Branch: `master`
- [ ] Verify Build Command: `pnpm install --frozen-lockfile --prod=false && pnpm build`
- [ ] Verify Start Command: `node apps/vault-api/dist/index.js`
- [ ] Save Changes
- [ ] Trigger Manual Deploy
- [ ] Monitor build logs
- [ ] Wait for deployment success

### 2. tekupvault-worker Service

- [ ] Navigate til `tekupvault-worker` service
- [ ] Gå til Settings
- [ ] Disconnect gammelt repository
- [ ] Connect til `TekupDK/tekup`
- [ ] Set Root Directory: `apps/production/tekup-vault`
- [ ] Set Branch: `master`
- [ ] Verify Build Command: `pnpm install --frozen-lockfile --prod=false && pnpm build`
- [ ] Verify Start Command: `node apps/vault-worker/dist/index.js`
- [ ] Save Changes
- [ ] Trigger Manual Deploy
- [ ] Monitor build logs
- [ ] Wait for deployment success

---

## 🧪 Post-Migration Testing

### Health Check

- [ ] Test: `curl https://tekupvault.onrender.com/health`
- [ ] Verify status: `"status": "ok"`

### Search API

- [ ] Test search endpoint med API key
- [ ] Verify JSON response med results

### Worker Logs

- [ ] Check worker logs for sync aktivitet
- [ ] Verify ingen critical errors

### Integration Tests

- [ ] Test Rendetalje backend integration
- [ ] Test Tekup AI Chat integration
- [ ] Verify semantic search virker

---

## 📊 Verification

- [ ] API responding på alle endpoints
- [ ] Worker syncing korrekt (check logs)
- [ ] No errors i logs (minor warnings OK)
- [ ] Environment variables alle sat korrekt
- [ ] Database connection OK
- [ ] GitHub sync fungerer
- [ ] OpenAI embeddings fungerer

---

## 📝 Documentation Updates

- [ ] Opdater README.md med ny repository info
- [ ] Opdater integrations dokumentation (hvis nødvendigt)
- [ ] Commit og push ændringer til TekupDK/tekup
- [ ] Tag release: `git tag v0.1.1-render-migration`
- [ ] Push tags: `git push --tags`

---

## 🎉 Completion

- [ ] All services running
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Team notified (hvis relevant)

---

**Estimated Time**: 15-20 minutter  
**Complexity**: Low  
**Risk**: Minimal (kan rollback til gammelt repo)

---

## 🆘 Rollback Plan (hvis noget går galt)

1. Gå tilbage til Render Settings
2. Disconnect `TekupDK/tekup`
3. Reconnect til gammelt `JonasAbde/TekupVault` repo
4. Reset Root Directory til `/`
5. Trigger redeploy
6. Services tilbage til original state

---

**Status**: Ready to execute  
**Contact**: Se RENDER_DEPLOYMENT_UPDATE.md for detaljer
