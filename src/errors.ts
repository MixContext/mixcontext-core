import en from './i18n/en';

// Custom error types surfaced by MixContext parsers

// New interface describing additional context information for an error
export interface ErrorContext {
  filename?: string;
  mime?: string;
}

// Helper that decorates an error with additional context and localized message
export function wrapErr(err: Error, ctx: ErrorContext): Error {
  const { filename, mime } = ctx;

  // Determine base (possibly localized) message depending on the error type
  let localizedMessage = err.message;
  if (err instanceof UnsupportedMimeError && mime) {
    localizedMessage = en.unsupportedMime.replace('{mime}', mime);
  } else if (err instanceof FileTooLargeError && filename) {
    localizedMessage = en.tooLarge.replace('{filename}', filename);
  }

  // Prepend context information – filename then mime (if provided)
  const prefixParts: string[] = [];
  if (filename) prefixParts.push(filename);
  if (mime) prefixParts.push(mime);
  const prefix = prefixParts.join(' ');
  const message = prefix ? `${prefix}: ${localizedMessage}` : localizedMessage;

  // Re-instantiate the same error type with the enriched message
  const WrappedError = (err as any).constructor as new (msg: string) => Error;
  const wrapped = new WrappedError(message);
  // Preserve original stack trace where possible
  wrapped.stack = err.stack;
  // Copy additional enumerable properties (e.g., mime)
  Object.assign(wrapped, err, ctx);
  return wrapped;
}

export class UnsupportedMimeError extends Error {
  mime?: string;
  constructor(mime: string, message = 'Unsupported MIME type') {
    super(message);
    this.name = 'UnsupportedMimeError';
    this.mime = mime;
  }
}

export class FileTooLargeError extends Error {
  constructor(message = 'File exceeds maximum size') {
    super(message);
    this.name = 'FileTooLargeError';
  }
}
