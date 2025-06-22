export interface LocalProviderOpts {
  model: string;
  endpoint: string;
}

interface LocalEmbeddingResponse {
  data: { embedding: number[] }[];
}

/**
 * Calls a local embedding HTTP endpoint compatible with OpenAI's `/embeddings` schema.
 * The `endpoint` should be the base URL (e.g. http://localhost:11434 or http://127.0.0.1:8080).
 */
export async function embed(
  inputs: string[],
  opts: LocalProviderOpts
): Promise<number[][]> {
  if (process.env.MIXCONTEXT_MOCK_EMBED === '1') {
    return inputs.map(() => Array(5).fill(0));
  }
  const url = `${opts.endpoint.replace(/\/+$/, '')}/embeddings`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model: opts.model, input: inputs })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Local embeddings request failed (${res.status}): ${errText}`);
  }

  const json = (await res.json()) as LocalEmbeddingResponse;
  return json.data.map(d => d.embedding);
}
