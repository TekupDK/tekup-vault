// Quick test of OpenAI embedding generation
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("❌ OPENAI_API_KEY not found in environment");
  process.exit(1);
}

console.log("✅ OpenAI API Key found:", apiKey.substring(0, 20) + "...");

const openai = new OpenAI({ apiKey });

async function testEmbedding() {
  try {
    console.log("\n🔄 Testing embedding generation...");

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: "This is a test document for TekupVault",
      dimensions: 1536,
    });

    const embedding = response.data[0].embedding;

    console.log("✅ Embedding generated successfully!");
    console.log("   - Model:", response.model);
    console.log("   - Dimensions:", embedding.length);
    console.log("   - First 5 values:", embedding.slice(0, 5));
    console.log("   - Usage tokens:", response.usage.total_tokens);
  } catch (error) {
    console.error("❌ Failed to generate embedding:", error.message);
    if (error.status) {
      console.error("   - Status:", error.status);
    }
    if (error.code) {
      console.error("   - Code:", error.code);
    }
  }
}

testEmbedding();
