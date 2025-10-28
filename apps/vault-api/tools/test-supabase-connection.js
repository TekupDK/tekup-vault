#!/usr/bin/env node
const { Pool } = require("pg");

function parseDatabaseUrl(dbUrl) {
  const u = new URL(dbUrl);
  return {
    host: u.hostname,
    port: Number(u.port || 5432),
    user: decodeURIComponent(u.username || "postgres"),
    password: decodeURIComponent(u.password || ""),
    database: (u.pathname || "/postgres").replace("/", "") || "postgres",
  };
}

async function testDirect(dbUrl) {
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  try {
    const r = await pool.query("SELECT version()");
    console.log("✅ Direct (5432) OK:", r.rows[0].version.split("\n")[0]);
  } catch (e) {
    console.log("❌ Direct (5432) FAILED:", e.message);
  } finally {
    await pool.end();
  }
}

async function testPooler(dbUrl, host) {
  const parsed = parseDatabaseUrl(dbUrl);
  const pool = new Pool({
    host: host || "aws-0-eu-central-1.pooler.supabase.com",
    port: 6543,
    user: "postgres",
    password: parsed.password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  });
  try {
    const r = await pool.query("SELECT version()");
    console.log(
      "✅ Session Pooler (6543) OK:",
      r.rows[0].version.split("\n")[0]
    );
  } catch (e) {
    console.log("❌ Session Pooler (6543) FAILED:", e.message);
  } finally {
    await pool.end();
  }
}

(async () => {
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.POSTGRES_URL ||
    process.env.VAULT_DATABASE_URL ||
    process.argv.find((a) => a.startsWith("db="))?.split("=")[1];
  if (!dbUrl) {
    console.error(
      "Missing database URL. Provide via DATABASE_URL (preferred) or SUPABASE_DB_URL/POSTGRES_URL/VAULT_DATABASE_URL, or pass as CLI arg: db=postgresql://..."
    );
    process.exit(1);
  }
  console.log("\n=== Supabase Connection Tests ===");
  await testDirect(dbUrl);
  await testPooler(dbUrl, process.env.SUPABASE_POOLER_HOST);
})();
