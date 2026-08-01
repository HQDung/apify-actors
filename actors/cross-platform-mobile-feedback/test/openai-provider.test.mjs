import assert from "node:assert/strict";
import { test } from "node:test";

import { createOpenAiProvider } from "../src/analysis/openai-provider.js";

test("creates an optional native-fetch provider without adding an SDK dependency", async () => {
  let request;
  const provider = createOpenAiProvider({
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"ok":true}' } }],
          usage: { prompt_tokens: 3, completion_tokens: 2 },
        }),
        { status: 200 },
      );
    },
  });
  const result = await provider({ prompt: "return JSON" });
  assert.equal(result.result, '{"ok":true}');
  assert.deepEqual(result.usage, { inputTokens: 3, outputTokens: 2 });
  assert.equal(request.url, "https://api.openai.com/v1/chat/completions");
  assert.equal(request.options.headers.authorization, "Bearer test-key");
  assert.equal(JSON.parse(request.options.body).model, "test-model");
});

test("does not activate a provider when no API key is configured", () => {
  assert.equal(createOpenAiProvider(), undefined);
});
