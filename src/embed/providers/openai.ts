export interface OpenAIProviderOpts {
  model: string;
  apiKey: string;
}

interface OpenAIEmbeddingResponse {
  data: { embedding: number[] }[];
}

/**
 * Calls OpenAI embeddings API and returns the embedding vectors for the given input texts.
 */
export async function embed(
  inputs: string[],
  opts: OpenAIProviderOpts
): Promise<number[][]> {
  // When running under tests we shortcut the network call by returning dummy vectors.
  if (process.env.MIXCONTEXT_MOCK_EMBED === '1') {
    return inputs.map(() => Array(5).fill(0));
  }

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.apiKey}`
    },
    body: JSON.stringify({ model: opts.model, input: inputs })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`OpenAI embeddings request failed (${res.status}): ${errText}`);
  }

  const json = (await res.json()) as OpenAIEmbeddingResponse;
  return json.data.map(d => d.embedding);
}
