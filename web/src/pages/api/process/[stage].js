import { authHeaders, requireSession } from "@/lib/api/session";
import { fail, forward, methodNotAllowed, notImplemented } from "@/lib/api/upstream";

/**
 * Process views: foreman, transport, payments, monitoring, knowledge graph, predictions.
 *
 * Unlike the feeds, all of these *are* `olduvai-server`'s business — they are views onto
 * coalitions, legs, and the ledger. They are one route because they are one traversal:
 * note 30 §6 is explicit that `/query` and `/coalitions/assemble` are *"the same engine —
 * different result shapes, one traversal. They are separate endpoints for response-shape
 * clarity only, not because they are separate subsystems."* The same is true here, and four
 * files would have implied four subsystems.
 *
 * ⭐ Each stage names the gate it waits on rather than sharing a generic one, because they
 * do not all unblock together — payments needs the ledger, monitoring needs sealed sensors,
 * and the knowledge graph needs a populated trie. A client can tell which is which.
 */

const STAGES = {
  /**
   * ⭐ First in the table because it is the only stage that is a participant's own record
   * rather than the exchange's.
   *
   * Note 33 §3: the foreman is advisory to one person, checked for coherence against itself,
   * and carries no weight on the exchange — *"If a farmer lies, they will get wrong results
   * and thats it."* Platform guarantees attach at sale. That is why it sits on the process
   * rail without a provenance guard: there is nothing here to defend against.
   */
  foreman: {
    label: "Foreman",
    path: "/v1/foreman",
    blockedBy: "no-participant-record",
    note: "Your own append-only record of your own activity, checked for coherence against itself. It is advisory to you and carries no weight on the exchange. Nothing has been recorded yet.",
  },
  transport: {
    label: "Transport",
    path: "/v1/coalitions/assemble",
    blockedBy: "cohesion-gate",
    note: "Haulage legs are coalition legs. Assembly is gated on the cohesion test (notes/30 §7 step 3), so there are no legs to show.",
  },
  payments: {
    label: "Payments",
    path: "/v1/ledger",
    blockedBy: "gate-and-ledger",
    note: "Settlement follows the append-only ledger, which is written per-leg at assembly (notes/30 §7 step 5). Nothing has been assembled.",
  },
  monitoring: {
    label: "Monitoring",
    path: "/v1/monitoring",
    blockedBy: "sealed-sensors",
    note: "⚠️ Process monitoring is only evidence if the reading is sealed at source (notes/19-sealed-sensors). An unsealed reading is an assertion by whoever typed it, and would be recorded as such.",
  },
  graph: {
    label: "Knowledge graph",
    path: "/v1/graph",
    blockedBy: "cohesion-gate",
    note: "The graph is the occupied trie. Until the cohesion test passes, its structure is not known to mean anything (notes/30 §7 step 3).",
  },
  /**
   * ⚠️ The one stage here that may never unblock, and the note says so rather than implying
   * a schedule.
   *
   * Every other gate in this table waits on work — a test to run, a ledger to fill, sensors
   * to seal. This one waits on a decision that an honest forecast is possible at all at the
   * resolution of a single holding.
   *
   * ⭐ It is also the stage most likely to be "solved" by reaching for a model, and that is
   * exactly what `README.md`'s third AI exclusion forbids: an entry must be recomputable
   * from the ledger years later by someone who does not have the model that produced it. A
   * plausible unrecomputable number is worse than no number, because it will be read as
   * evidence and there is no way to check it.
   */
  predictions: {
    label: "Predictions",
    path: "/v1/predictions",
    blockedBy: "no-forecast-method",
    note: "A prediction here would have to be recomputable from the ledger years later by someone without the model that produced it. No method meeting that has been chosen, and whether one exists at single-holding resolution is an open question. This shows nothing rather than a number that would be read as evidence.",
  },
};

export default async function handler(req, res) {
  if (methodNotAllowed(req, res, "GET")) return;

  const { stage } = req.query;
  const spec = STAGES[stage];

  if (!spec) {
    return fail(
      res,
      404,
      "unknown_stage",
      `No process stage named "${stage}". Known stages: ${Object.keys(STAGES).join(", ")}.`
    );
  }

  if (requireSession(req, res)) return;

  const result = await forward(spec.path, { headers: authHeaders(req) });

  if (!result.ok) {
    return notImplemented(res, {
      blockedBy: spec.blockedBy,
      note: spec.note,
    });
  }

  return res.status(200).json({ ok: true, data: result.data });
}
