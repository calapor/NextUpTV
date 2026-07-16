import "server-only";
import { neon } from "@neondatabase/serverless";
const FLAG_KEY = "claude_api";
const TTL_MS = 30_000;
let cache: { enabled: boolean; at: number } | null = null;
export const CLAUDE_HALTED_MESSAGE = "Claude API budget for today has been used, please try again tomorrow.";
export async function isClaudeHalted(): Promise<boolean> {
  const url = process.env.FLAGS_DATABASE_URL;
  if (!url) return false;
  if (cache && Date.now() - cache.at < TTL_MS) return !cache.enabled;
  try {
    const sql = neon(url);
    const rows = (await sql`SELECT enabled FROM global_flags WHERE key = ${FLAG_KEY} LIMIT 1`) as Array<{ enabled: boolean }>;
    const enabled = rows[0]?.enabled ?? true;
    cache = { enabled, at: Date.now() };
    return !enabled;
  } catch { return false; }
}
