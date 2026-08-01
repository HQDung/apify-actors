const defaultEndpoint = "https://api.openai.com/v1/chat/completions";

export const createOpenAiProvider = ({
  apiKey,
  model = "gpt-4o-mini",
  endpoint = defaultEndpoint,
  fetchImpl = globalThis.fetch,
} = {}) => {
  if (!apiKey) return undefined;
  return async ({ prompt }) => {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      const message =
        payload?.error?.message ?? `OpenAI returned HTTP ${response.status}`;
      const error = new Error(`ANALYSIS_PROVIDER_ERROR: ${message}`);
      error.httpStatus = response.status;
      throw error;
    }
    return {
      result: payload.choices?.[0]?.message?.content,
      usage: {
        inputTokens: payload.usage?.prompt_tokens ?? 0,
        outputTokens: payload.usage?.completion_tokens ?? 0,
      },
    };
  };
};
