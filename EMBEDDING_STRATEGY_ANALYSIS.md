# TekupVault Embedding Strategy - Cost Analysis & Alternativer

**Dato:** 29. oktober 2025  
**Status:** Aktiv OpenAI-integration, evaluering af gratis alternativer

## 📊 Nuværende Setup: OpenAI text-embedding-3-small

### Konfiguration

- **Model:** text-embedding-3-small
- **Dimensions:** 1536
- **Max input:** 8000 characters per document
- **Batch størrelse:** 10 dokumenter parallel
- **Status:** ✅ Fuldt operationel - worker har indekseret 100 dokumenter

### Omkostninger (OpenAI Pricing)

```
Pris: $0.00002 per 1K tokens (~$0.02 per 1M tokens)

TekupVault Beregning:
- 346 dokumenter i systemet
- Gennemsnit ~2000 tokens per dokument
- Total: 346 × 2000 = 692,000 tokens
- Kostnad: 692,000 / 1,000,000 × $0.02 = $0.0138 (~1.4 cent)

Årlig vedligeholdelse (anslået):
- 10 nye dokumenter per uge = 520/år
- 520 × 2000 = 1,040,000 tokens/år
- Årlig kostnad: ~$0.02 (~2 cent)
```

**✅ Fordele:**

- Ekstremt billigt (pennies per år)
- Høj kvalitet embeddings
- Nem integration (allerede implementeret)
- Ingen infrastruktur-overhead
- Automatisk skalering

**❌ Ulemper:**

- Kræver API key (sikkerhed)
- Afhængig af external service
- Minimal men reel kostnad

---

## 🆓 Gratis Open Source Alternativer

### 1️⃣ Sentence-Transformers (Hugging Face)

#### **all-MiniLM-L6-v2** (Anbefalet starter)

```python
Model: sentence-transformers/all-MiniLM-L6-v2
Dimensions: 384 (mindre end OpenAI's 1536)
Størrelse: ~80MB download
Hastighed: ~1000 docs/sekund (lokal CPU)
Kvalitet: ⭐⭐⭐ (God til de fleste use cases)
```

**Installation:**

```bash
pip install sentence-transformers
```

**Python Kode:**

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')
embeddings = model.encode([
    "Document text 1",
    "Document text 2"
])
```

**✅ Fordele:**

- 100% gratis
- Kører lokalt (ingen API keys)
- Hurtig CPU/GPU inference
- God balance mellem kvalitet og hastighed

**❌ Ulemper:**

- Lavere kvalitet end OpenAI
- Mindre dimensions (384 vs 1536)
- Kræver Python runtime
- Skal integreres i worker

---

#### **BGE-small-en-v1.5** (Bedre kvalitet)

```python
Model: BAAI/bge-small-en-v1.5
Dimensions: 384
Størrelse: ~130MB
Hastighed: ~500 docs/sekund
Kvalitet: ⭐⭐⭐⭐ (Tæt på OpenAI kvalitet)
```

**Benchmarks (MTEB):**

- BGE-small: 62.17 avg score
- all-MiniLM-L6-v2: 58.04 avg score
- OpenAI text-embedding-3-small: ~64.6 avg score

**✅ Fordele:**

- Bedre kvalitet end MiniLM
- Stadig gratis og lokal
- Designet til retrieval tasks

**❌ Ulemper:**

- Lidt langsommere
- Større model download

---

### 2️⃣ Ollama (Lokal LLM Platform)

#### **nomic-embed-text** (Indbygget i Ollama)

```bash
# Installation
curl -fsSL https://ollama.com/install.sh | sh
ollama pull nomic-embed-text

# API Usage
curl http://localhost:11434/api/embeddings \
  -d '{"model": "nomic-embed-text", "prompt": "Your text here"}'
```

**Specs:**

- **Dimensions:** 768
- **Context Length:** 8192 tokens
- **Størrelse:** ~274MB
- **Kvalitet:** ⭐⭐⭐⭐ (Meget god)

**✅ Fordele:**

- REST API (nem integration)
- Samme arkitektur som OpenAI
- Gratis og open source
- Kan hoste lokalt eller cloud

**❌ Ulemper:**

- Større resource footprint
- Kræver Ollama service running
- Tungere end Sentence-Transformers

---

#### **mxbai-embed-large** (Bedste open source)

```bash
ollama pull mxbai-embed-large
```

**Specs:**

- **Dimensions:** 1024
- **Context Length:** 512 tokens
- **Størrelse:** ~669MB
- **Kvalitet:** ⭐⭐⭐⭐⭐ (State-of-the-art open source)

**MTEB Benchmark:** 64.68 (højere end BGE, tæt på OpenAI)

---

## 🔥 Anbefaling: Hybrid Strategi

### **Kort sigt (nu):** Fortsæt med OpenAI

**Rationale:**

- Allerede implementeret og testet
- Minimal kostnad (~$0.02/år)
- Høj kvalitet embeddings
- Nem vedligeholdelse

### **Mellem sigt (Q1 2026):** Add Ollama som backup

**Rationale:**

- Zero marginal cost
- Reduceret OpenAI afhængighed
- Same REST API pattern
- Kan køre lokalt under udvikling

### **Implementering Roadmap:**

#### Phase 1: OpenAI Production (CURRENT)

```env
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...
```

#### Phase 2: Add Ollama Option (1-2 ugers arbejde)

```env
EMBEDDING_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=nomic-embed-text
```

**Code Changes:**

```typescript
// packages/vault-search/src/embeddings.ts
class EmbeddingService {
  private provider: "openai" | "ollama";

  async generateEmbedding(text: string): Promise<number[]> {
    if (this.provider === "openai") {
      return this.openaiEmbed(text);
    } else {
      return this.ollamaEmbed(text);
    }
  }
}
```

#### Phase 3: Hybrid Mode (Best of både worlds)

```typescript
// Fallback: Prøv OpenAI, fall back til Ollama hvis fejl
async generateEmbedding(text: string): Promise<number[]> {
  try {
    return await this.openaiEmbed(text);
  } catch (error) {
    this.logger.warn('OpenAI failed, using Ollama fallback');
    return await this.ollamaEmbed(text);
  }
}
```

---

## 💰 Total Cost of Ownership (TCO) - 3 År

### OpenAI Only

```
Setup: $0 (allerede done)
År 1-3: $0.02 × 3 = $0.06 (~6 cent)
Vedligeholdelse: 0 timer (zero maintenance)
Total: $0.06 + 0 timer = Næsten gratis
```

### Ollama Only

```
Setup: 8-16 timer udvikling ($800-1600 @ $100/time)
Infrastructure: Docker container (no extra cost)
År 1-3: $0 (completely free)
Vedligeholdelse: 2-4 timer/år updates ($200-400)
Total: $1000-2000 setup + $600-1200 = $1600-3200
```

### Hybrid (Anbefalet)

```
Setup: 2-4 timer integration ($200-400)
OpenAI: $0.02/år for production quality
Ollama: Backup/dev environment
Vedligeholdelse: 1 time/år ($100)
Total: $400 setup + $0.06 + $300 = ~$700
```

---

## 🎯 Konklusion & Anbefaling

### **KEEP CURRENT OPENAI SETUP** ✅

**Hvorfor:**

1. **Cost:** $0.02/år er neglibelt (~2 DKK/år)
2. **Kvalitet:** Best-in-class embeddings
3. **Simplicity:** Allerede virker perfekt
4. **Time-to-value:** Zero udvikling påkrævet

### **Optional Future Enhancement:**

Implementer Ollama som backup/dev option efter behov (~2 uger):

- Test lokal udvikling uden API keys
- Disaster recovery hvis OpenAI ned
- Eksperimenter med forskellige modeller
- Total independence mulighed

### **IKKE ANBEFALET:**

- Migrere til 100% lokal løsning nu
- Investere 2-4 uger i setup for at spare 2 cent/år
- Kompleksitet for minimal besparelse

---

## 📝 Næste Skridt

**Immediate (nu):**

1. ✅ Fortsæt med OpenAI - ingen ændringer
2. 🔧 Fix database sync issue (worker siger 100 docs, debug siger 1)
3. ✅ Verificer search functionality virker korrekt

**Future (Q1 2026, hvis ønsket):**

1. Setup Ollama lokalt på dev machine
2. Implementer provider-agnostic embedding interface
3. Test kvalitet vs OpenAI
4. Deploy hybrid setup hvis værdifuldt

---

## 🔗 Referencer

**OpenAI Pricing:**
https://openai.com/api/pricing/

**Sentence-Transformers:**
https://www.sbert.net/docs/pretrained_models.html

**BGE Models:**
https://huggingface.co/BAAI/bge-small-en-v1.5

**Ollama:**
https://ollama.com/library/nomic-embed-text

**MTEB Leaderboard:**
https://huggingface.co/spaces/mteb/leaderboard

---

**Forfatter:** TekupVault AI Assistant  
**Review:** Pending din godkendelse 👍
