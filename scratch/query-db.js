import pg from "pg";
const { Pool } = pg;

const connectionString = "postgresql://postgres.advvxzctpdogmxtyyaxk:UQSjRoWytETLMDAG@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres";
const pool = new Pool({ connectionString });

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT id, title, framework, LENGTH(generated_code) as len FROM sketches ORDER BY id DESC LIMIT 5");
    console.log("Latest Sketches in Database:");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
