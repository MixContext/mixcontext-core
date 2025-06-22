import type { ParserFn } from '../types';
import { getPlugin } from '../plugin';

// Internal store maps lowercase mime-type -> parser function
const registry = new Map<string, ParserFn>();

export function registerParser(mime: string, fn: ParserFn): void {
  registry.set(mime.toLowerCase(), fn);
}

export function getParser(mime: string): ParserFn | undefined {
  // 1. Check built-in parser registry first.
  const internal = registry.get(mime.toLowerCase());
  if (internal) return internal;

  // 2. Fall back to runtime-registered plugins.
  const plugin = getPlugin(mime);
  return plugin?.parse;
}
