/**
 * The staged pipeline, declared as data.
 *
 * # ⭐ What was taken from four-sided-triangle, and what was left
 *
 * `notes/31-dashboard-design.md` item 1 cites `fullscreen-triangle/four-sided-triangle` as
 * an example to extract ideas from. Three of its ideas survive contact with this exchange:
 *
 *   1. **Staging.** A query is not one model call. It is understood, then answered by
 *      whatever is most specialised, then checked. Each step is nameable and inspectable.
 *   2. **A process monitor that scores stages and can send one back.** Refinement is driven
 *      by a measured deficiency, not by a fixed retry count.
 *   3. **Working memory scoped to a single query.** One session, discarded after.
 *
 * ⚠️ Three of its ideas are deliberately *not* here:
 *
 *   - **ATDB** (adversarial throttle detection) is premised on a commercial provider
 *     deliberately capping depth. The base model here runs on the participant's own
 *     hardware. There is nothing to detect and nothing to circumvent.
 *   - **Ensemble diversification** picks a varied subset of candidate answers. Variety is a
 *     virtue when the output is prose. Here, the parts of the answer that matter are
 *     proposals about a participant's own consignment, and there is no sense in which one
 *     wants a *diverse* reading of a delivery note.
 *   - **A reward model that scores and reranks.** ⚠️ This is the exclusion, not a
 *     simplification. See below.
 *
 * # ⚠️ The three exclusions, restated for this file
 *
 * `README.md` names three things a model may never do here: **the address path**,
 * **ranking**, and **deterministic synthesis**. All three are easy to violate by accident
 * while writing a RAG system, because a conventional RAG *is* a ranker — it embeds, scores
 * by similarity, and returns a top-k.
 *
 * So the retrieval in this pipeline never ranks *exchange records*. It ranks nothing the
 * engine addresses. What it retrieves is **reference material** — notes, agronomic
 * guidance, the participant's own past entries as text — to ground an explanation. Matching
 * a participant against a coalition remains longest-common-prefix in `olduvai-core`, with no
 * parameters, and `notes/28-matching-is-search.md` is explicit that there is no second
 * matching system. This pipeline sits *beside* the query engine and must never become a
 * rival to it.
 *
 * The output is therefore always one of two things:
 *
 *   - **prose**, which explains or asks, and commits nothing; or
 *   - **a proposal**, which a named participant must confirm before it becomes a `Field`,
 *     and which arrives at `Source::Asserted` with evidential weight `0.0` when they do.
 *
 * There is no third kind of output. A stage that wanted to emit one would be the bug.
 */

/**
 * ⭐ Every stage declares which tier runs it.
 *
 * `notes/31` item 1: *"the base model is ollama, and then, huggingfaceapi should be used to
 * retrieve specialised domain models."* That is a two-tier arrangement, and the tier is a
 * property of the stage rather than of the request:
 *
 *   - `BASE` — the local Ollama model. Always available when Ollama is running, costs
 *     nothing per call, and the participant's text never leaves their machine.
 *   - `SPECIALIST` — a domain model pulled through the HuggingFace Inference API. Better on
 *     its one subject, and **remote**, which is the reason it is not the default.
 *
 * ⚠️ A `SPECIALIST` stage degrades to `BASE` rather than failing. A specialist that is
 * unreachable should cost quality, not availability — but the degradation is *reported*, in
 * `Trace`, because an answer produced without the specialist is a different answer and the
 * participant is entitled to know which one they got.
 */
export const Tier = {
  BASE: "base",
  SPECIALIST: "specialist",
};

/**
 * The stages, in order.
 *
 * Fewer than four-sided-triangle's eight. The ones that are missing are missing for the
 * reasons in the module doc — mostly because they rank, and ranking is excluded.
 */
export const STAGES = [
  {
    id: "understand",
    label: "Understand",
    tier: Tier.BASE,
    /**
     * Intent, entities, and — the part that matters here — whether this is answerable at
     * all. A question about *which coalition to join* is not for this pipeline; it is for
     * the query engine, and the honest answer is to say so and hand over.
     */
    describe:
      "Classify what is being asked and extract the quantities, units, and named things in it.",
  },
  {
    id: "ground",
    label: "Ground",
    tier: Tier.BASE,
    /**
     * Retrieval. ⚠️ Over reference material only — never over the trie, never over other
     * participants' entries. See the module doc.
     */
    describe:
      "Retrieve reference material that bears on the question. Reference only — never exchange records.",
  },
  {
    id: "specialise",
    label: "Specialise",
    tier: Tier.SPECIALIST,
    /**
     * The domain model. This is the stage `notes/31` is really asking for: the base model
     * has understood the question, and now the model that actually knows about soils, or
     * phytosanitary rules, or freight, answers it.
     */
    describe:
      "Answer with a domain model chosen for this page's subject, if one is reachable.",
  },
  {
    id: "compose",
    label: "Compose",
    tier: Tier.BASE,
    /**
     * ⚠️ Composition is *prose assembly*, not `olduvai-core`'s deterministic synthesis. The
     * two words collide and the collision is dangerous, so: this stage writes a paragraph.
     * It never computes a value that enters an entry. Anything that would enter an entry
     * leaves this pipeline as a proposal for a human to confirm.
     */
    describe:
      "Write the answer, and separate anything that would change an entry into a proposal.",
  },
  {
    id: "check",
    label: "Check",
    tier: Tier.BASE,
    /**
     * The process monitor, kept from four-sided-triangle and narrowed. It scores the draft
     * and can send `compose` back once.
     */
    describe:
      "Score the draft for support, unit discipline, and overreach. Refine once if it fails.",
  },
];

/**
 * What the `check` stage scores.
 *
 * ⭐ four-sided-triangle scores completeness, consistency, confidence, compliance, and
 * correctness. Three of those are kept as-is; two are replaced by axes that matter here and
 * do not exist there.
 *
 * `grounded` and `bounded` are the local additions, and they are the ones that enforce the
 * exclusions at the level of the output rather than the level of the code. A stage cannot
 * rank if the checker rejects any answer that claims a ranking.
 */
export const CHECKS = {
  grounded: {
    label: "Grounded",
    /** Every factual claim traces to retrieved material or to the participant's own words. */
    detail: "Claims trace to something retrieved, or are marked as the model's own inference.",
  },
  unitful: {
    label: "Unitful",
    /**
     * ⚠️ Note 30 §5.3: every value carries `{value, unit, source, precision}`. A bare number
     * in an answer about a consignment is a defect, not a stylistic preference — it is a
     * value that cannot be recorded.
     */
    detail: "Every quantity carries a unit. A bare number about a consignment is a defect.",
  },
  bounded: {
    label: "Bounded",
    /**
     * ⭐ The exclusions, as an output test. An answer that ranks participants, asserts an
     * address, or presents a computed entry value as final has crossed a line the code
     * cannot see — so it is checked for here.
     */
    detail:
      "No ranking of participants, no asserted address, no value presented as though it were recorded.",
  },
  answerable: {
    label: "Answerable",
    /** Saying "the engine is gated and I cannot know this" is a pass, not a failure. */
    detail: "If the question needs the query engine, it says so instead of guessing.",
  },
};

/** Lookup by id, for the runner and for the trace view. */
export function stage(id) {
  return STAGES.find((s) => s.id === id) ?? null;
}
