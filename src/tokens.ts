// Copyright 2025 MixContext.ai
// SPDX-License-Identifier: MIT

import { GPTTokens } from 'gpt-tokens';

// Default model used for token estimation across the code-base.
export const TOKENS_MODEL = 'gpt-3.5-turbo';

/**
 * Estimate token count for a given text using gpt-tokens.
 * Falls back to an upper-bound approximation if tokenizer throws.
 */
export function estimateTokens(text: string): number {
  try {
    return GPTTokens.contentUsedTokens(TOKENS_MODEL, text);
  } catch {
    // Fallback to previous heuristic to avoid runtime breakage in edge cases.
    return Math.ceil(text.length / 4.2);
  }
}
