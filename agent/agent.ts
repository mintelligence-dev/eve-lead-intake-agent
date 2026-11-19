import { defineAgent } from "eve";
import { contextWindowTokens, fallbackModelId, languageModel, primaryModelId } from "./lib/model";
import { resilientModel } from "./lib/resilient-model";

// Model ids come from env (AI_MODEL / AI_FALLBACK_MODEL, see lib/model.ts).
// Transient errors are retried, then the fallback model is tried once, so a
// short outage doesn't fail the turn (see lib/resilient-model.ts).
export default defineAgent({
  model: resilientModel(
    languageModel(primaryModelId),
    resilientModel(languageModel(fallbackModelId), undefined, "fallback"),
  ),
  modelContextWindowTokens: contextWindowTokens,
});
