import type { MCXDocument, ParserInput } from './types.js';

export interface ParserPlugin {
  /** MIME type string or regular expression this plugin can handle. */
  mime: string | RegExp;
  /**
   * Parse the supplied file buffer into an MCXDocument.
   * Implementations should throw if parsing fails.
   */
  parse(input: ParserInput): Promise<MCXDocument>;
}

// Internal registry of runtime-registered plugins.
const plugins: ParserPlugin[] = [];

/**
 * Register a new parser plugin during application startup.
 */
export function registerPlugin(p: ParserPlugin): void {
  plugins.push(p);
}

/**
 * Retrieve the first plugin that matches the given MIME type.
 */
export function getPlugin(mime: string): ParserPlugin | undefined {
  return plugins.find((p) =>
    typeof p.mime === 'string' ? p.mime === mime : p.mime.test(mime),
  );
}
