/**
 * Create (or recreate) Concierge on the current ElevenLabs workspace
 * when agents.json id is missing, then write the new id back.
 *
 * Usage: node scripts/create-concierge-agent.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const root = resolve(import.meta.dirname, "..");

function loadEnvLocal() {
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
}

loadEnvLocal();

const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
if (!apiKey) {
  console.error("Missing ELEVENLABS_API_KEY");
  process.exit(1);
}

const agentsPath = resolve(root, "agents.json");
const agents = JSON.parse(readFileSync(agentsPath, "utf8"));
const entry = agents.agents[0];
const config = JSON.parse(readFileSync(resolve(root, entry.config), "utf8"));
const client = new ElevenLabsClient({ apiKey });

console.log(`Creating agent from ${entry.config}`);

const created = await client.conversationalAi.agents.create({
  name: config.name,
  conversationConfig: config.conversation_config,
  platformSettings: config.platform_settings,
  tags: config.tags,
  ...(config.workflow ? { workflow: config.workflow } : {}),
});

const agentId = created.agentId ?? created.agent_id;
if (!agentId) {
  console.error("Create returned no agent id", created);
  process.exit(1);
}

entry.id = agentId;
if (created.versionId ?? created.version_id) {
  entry.version_id = created.versionId ?? created.version_id;
}
if (created.branchId ?? created.branch_id) {
  entry.branch_id = created.branchId ?? created.branch_id;
}

writeFileSync(agentsPath, `${JSON.stringify(agents, null, 4)}\n`);

const configTsPath = resolve(root, "src/lib/elevenlabs/config.ts");
let configTs = readFileSync(configTsPath, "utf8");
configTs = configTs.replace(
  /export const SHARED_CONCIERGE_AGENT_ID =\s*"[^"]+";/,
  `export const SHARED_CONCIERGE_AGENT_ID =\n  "${agentId}";`,
);
writeFileSync(configTsPath, configTs);

console.log("Create OK");
console.log(`  agent_id: ${agentId}`);
console.log(`  name: ${created.name ?? config.name}`);
console.log("Updated agents.json and src/lib/elevenlabs/config.ts");
console.log("");
console.log("Set in .env.local and Vercel:");
console.log(`ELEVENLABS_DEFAULT_AGENT_ID=${agentId}`);
