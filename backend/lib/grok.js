const env = require('./env');

const ENDPOINT = 'https://api.x.ai/v1/chat/completions';
const TIMEOUT_MS = 60_000;

class GrokError extends Error {
  constructor(message, { status = 502, code = 'grok_failed' } = {}) {
    super(message);
    this.name = 'GrokError';
    this.status = status;
    this.code = code;
  }
}

function configured(apiKey = env.XAI_API_KEY) {
  return Boolean(apiKey);
}

async function complete({
  system,
  messages,
  apiKey = env.XAI_API_KEY,
  model = env.GROK_MODEL,
  fetchImpl = fetch,
}) {
  if (!apiKey) {
    throw new GrokError('Grok is not configured.', { status: 503, code: 'grok_not_configured' });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetchImpl(ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        reasoning_effort: 'low',
        max_tokens: 800,
        messages: [{ role: 'system', content: system }, ...messages],
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data) {
      throw new GrokError('Grok could not answer.', { status: 502, code: 'grok_upstream' });
    }

    const text = data.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) {
      throw new GrokError('Grok returned an empty answer.', { status: 502, code: 'grok_empty' });
    }
    return text.trim();
  } catch (err) {
    if (err instanceof GrokError) throw err;
    if (err.name === 'AbortError') {
      throw new GrokError('Grok took too long to answer.', { status: 504, code: 'grok_timeout' });
    }
    throw new GrokError('Grok could not answer.', { status: 502, code: 'grok_upstream' });
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { complete, configured, GrokError };
