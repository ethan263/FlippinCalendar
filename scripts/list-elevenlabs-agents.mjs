import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const root = resolve(import.meta.dirname, "..");
try {
  const text = readFileSync(resolve(root, ".env.local"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // optional
}

const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
if (!apiKey) {
  console.error("Missing ELEVENLABS_API_KEY");
  process.exit(1);
}

const client = new ElevenLabsClient({ apiKey });
const page = await client.conversationalAi.agents.list({ pageSize: 50 });
const agents = page.agents ?? [];
console.log(`count: ${agents.length}`);
for (const a of agents) {
  console.log(
    JSON.stringify({
      id: a.agentId,
      name: a.name,
      tags: a.tags,
    }),
  );
}
