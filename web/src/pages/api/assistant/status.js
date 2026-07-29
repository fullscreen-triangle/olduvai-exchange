import { agentFor } from "@/lib/ai/agents";
import * as hf from "@/lib/ai/huggingface";
import * as ollama from "@/lib/ai/ollama";
import { STAGES } from "@/lib/ai/stages";
import { methodNotAllowed } from "@/lib/api/upstream";

/**
 * What the assistant can currently do, and what it cannot.
 *
 * ⭐ This exists so the composer never has to guess. Ollama is a process the participant
 * starts; it is frequently not running, and the difference between "not running", "running
 * with no model installed", and "running and ready" needs three different sentences on the
 * page. Discovering that by sending a query and reading the failure would mean the first
 * thing a new participant sees is an error.
 *
 * ⚠️ This route reports and does not decide. Per `notes/30` §4 the BFF holds session
 * handling and response shaping only — no admissibility logic. Nothing here is admissibility
 * logic: whether a model is reachable is an operational fact, not a claim about the
 * exchange.
 */
export default async function handler(req, res) {
  if (methodNotAllowed(req, res, "GET")) return;

  const agent = agentFor(req.query.agent);
  const base = await ollama.probe();
  const specialist = hf.resolve(agent.domain);

  return res.status(200).json({
    ok: true,
    data: {
      ready: base.running && Boolean(base.model),
      base: {
        running: base.running,
        // ⚠️ The URL is reported so the remedy is actionable, and it is a loopback address
        // by default. If it is ever configured to something remote, that is worth seeing.
        url: base.url,
        model: base.model,
        models: base.models,
        configuredMissing: base.configuredMissing ?? null,
        remedy: base.running
          ? base.model
            ? null
            : "No model installed. Try: ollama pull llama3.2"
          : "Ollama is not running. Start it with: ollama serve",
      },
      specialist: {
        // ⚠️ Deliberately does not report whether a token is present as a separate field —
        // `usable` plus a reason says everything the client needs, and enumerating the
        // presence of credentials is a habit worth not forming.
        usable: specialist.usable,
        model: specialist.model,
        note: specialist.note,
      },
      agent: { id: agent.id, label: agent.label, domain: agent.domain },
      stages: STAGES.map((s) => ({ id: s.id, label: s.label, tier: s.tier })),
    },
  });
}
