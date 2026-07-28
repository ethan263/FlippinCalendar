/**
 * One-shot: create client tools + Concierge agent in the ElevenLabs workspace
 * for the API key in .env.local, then update local agents.json / tools.json /
 * SHARED_CONCIERGE_AGENT_ID / ELEVENLABS_DEFAULT_AGENT_ID.
 *
 * Does not print secrets.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const API = "https://api.elevenlabs.io/v1/convai";

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  const text = fs.readFileSync(envPath, "utf8");
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

async function api(apiKey, method, urlPath, body) {
  const res = await fetch(`${API}${urlPath}`, {
    method,
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const msg =
      json?.detail?.message ||
      json?.detail ||
      text ||
      `${res.status} ${res.statusText}`;
    const err = new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}

function writeJson(rel, data) {
  fs.writeFileSync(path.join(root, rel), `${JSON.stringify(data, null, 4)}\n`);
}

async function main() {
  const env = loadEnvLocal();
  const apiKey = env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    console.error("BLOCKER: ELEVENLABS_API_KEY missing in .env.local");
    process.exit(1);
  }

  const agentsManifest = readJson("agents.json");
  const toolsManifest = readJson("tools.json");
  const agentConfig = readJson(
    "agent_configs/flippinCalendar-Concierge.json",
  );

  console.log("Listing remote agents...");
  const listed = await api(apiKey, "GET", "/agents");
  const remoteAgents = listed.agents ?? [];
  console.log(`Remote agent count: ${remoteAgents.length}`);

  const existing = remoteAgents.find(
    (a) =>
      a.name === agentConfig.name ||
      a.agent_id === agentsManifest.agents[0]?.id,
  );

  console.log("Listing remote tools...");
  let remoteTools = [];
  try {
    const toolsResp = await api(apiKey, "GET", "/tools");
    remoteTools = toolsResp.tools ?? toolsResp ?? [];
    if (!Array.isArray(remoteTools)) remoteTools = [];
  } catch (e) {
    console.log(`Tools list warning: ${e.message}`);
  }
  console.log(`Remote tool count: ${remoteTools.length}`);

  const toolIdMap = {};
  for (const entry of toolsManifest.tools) {
    const cfg = readJson(entry.config);
    const remoteMatch = remoteTools.find(
      (t) =>
        t.id === entry.id ||
        t.tool_config?.name === cfg.name ||
        t.tool_config?.tool_config?.name === cfg.name,
    );
    if (remoteMatch?.id) {
      toolIdMap[entry.id] = remoteMatch.id;
      console.log(`Reuse tool ${cfg.name} -> ${remoteMatch.id}`);
      continue;
    }

    const tool_config = {
      type: cfg.type,
      name: cfg.name,
      description: cfg.description,
      expects_response: cfg.expects_response,
      parameters: cfg.parameters,
      response_timeout_secs: cfg.response_timeout_secs,
      pre_tool_speech: cfg.pre_tool_speech,
      dynamic_variables: cfg.dynamic_variables,
    };
    console.log(`Creating tool ${cfg.name}...`);
    const created = await api(apiKey, "POST", "/tools", { tool_config });
    const newId = created.id ?? created.tool_id;
    if (!newId) {
      throw new Error(`Tool create returned no id for ${cfg.name}`);
    }
    toolIdMap[entry.id] = newId;
    console.log(`Created tool ${cfg.name} -> ${newId}`);
  }

  // Remap tool_ids in agent prompt
  const oldToolIds = agentConfig.conversation_config?.agent?.prompt?.tool_ids ?? [];
  const newToolIds = oldToolIds.map((id) => toolIdMap[id] ?? id);
  agentConfig.conversation_config.agent.prompt.tool_ids = newToolIds;

  // Drop attached tests that likely don't exist in this empty workspace
  if (agentConfig.platform_settings?.testing) {
    agentConfig.platform_settings.testing.attached_tests = [];
    agentConfig.platform_settings.testing.referenced_tests_ids = [];
  }

  const payload = {
    name: agentConfig.name,
    conversation_config: agentConfig.conversation_config,
    platform_settings: agentConfig.platform_settings,
    tags: agentConfig.tags,
    workflow: agentConfig.workflow,
  };

  let agentId;
  let versionId;
  let branchId;

  if (existing?.agent_id) {
    agentId = existing.agent_id;
    console.log(`Updating existing agent ${agentId}...`);
    const updated = await api(apiKey, "PATCH", `/agents/${agentId}`, payload);
    versionId = updated.version_id ?? existing.version_id;
    branchId = updated.branch_id ?? existing.branch_id;
  } else {
    console.log("Creating agent...");
    const created = await api(apiKey, "POST", "/agents/create", payload);
    agentId = created.agent_id;
    versionId = created.version_id;
    branchId = created.branch_id;
    console.log(`Created agent ${agentId}`);
  }

  if (!agentId) {
    throw new Error("No agent_id after create/update");
  }

  // Fetch fresh metadata
  const remote = await api(apiKey, "GET", `/agents/${agentId}`);
  versionId = remote.version_id ?? versionId ?? null;
  branchId = remote.branch_id ?? branchId ?? null;
  console.log(`Verified remote name=${remote.name} id=${remote.agent_id}`);
  if (versionId) console.log(`version_id=${versionId}`);
  if (branchId) console.log(`branch_id=${branchId}`);

  // Update agents.json
  agentsManifest.agents = [
    {
      config: "agent_configs/flippinCalendar-Concierge.json",
      id: agentId,
      ...(versionId ? { version_id: versionId } : {}),
      ...(branchId ? { branch_id: branchId } : {}),
    },
  ];
  writeJson("agents.json", agentsManifest);

  // Update tools.json ids
  toolsManifest.tools = toolsManifest.tools.map((t) => ({
    ...t,
    id: toolIdMap[t.id] ?? t.id,
  }));
  writeJson("tools.json", toolsManifest);

  // Persist remapped tool_ids into agent config
  writeJson("agent_configs/flippinCalendar-Concierge.json", agentConfig);

  // Update SHARED_CONCIERGE_AGENT_ID in config.ts
  const configPath = path.join(root, "src/lib/elevenlabs/config.ts");
  let configSrc = fs.readFileSync(configPath, "utf8");
  configSrc = configSrc.replace(
    /export const SHARED_CONCIERGE_AGENT_ID =\s*\n?\s*"[^"]+";/,
    `export const SHARED_CONCIERGE_AGENT_ID =\n  "${agentId}";`,
  );
  fs.writeFileSync(configPath, configSrc);

  // Update .env.local DEFAULT_AGENT_ID
  const envPath = path.join(root, ".env.local");
  let envText = fs.readFileSync(envPath, "utf8");
  if (/^ELEVENLABS_DEFAULT_AGENT_ID=/m.test(envText)) {
    envText = envText.replace(
      /^ELEVENLABS_DEFAULT_AGENT_ID=.*$/m,
      `ELEVENLABS_DEFAULT_AGENT_ID=${agentId}`,
    );
  } else {
    envText += `\nELEVENLABS_DEFAULT_AGENT_ID=${agentId}\n`;
  }
  fs.writeFileSync(envPath, envText);
  console.log(`Updated .env.local ELEVENLABS_DEFAULT_AGENT_ID=${agentId}`);

  console.log("PUSH_OK");
  console.log(
    JSON.stringify(
      {
        agent_id: agentId,
        version_id: versionId,
        branch_id: branchId,
        tool_id_map: toolIdMap,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error("PUSH_FAILED:", e.message);
  if (e.body) console.error(JSON.stringify(e.body, null, 2).slice(0, 2000));
  process.exit(1);
});
