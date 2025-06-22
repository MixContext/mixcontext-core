import type { ParserPlugin } from '../../../src/plugin';

// Example CSV parser plugin used in tests and documentation.
const csvParserPlugin: ParserPlugin = {
  mime: 'text/csv',
  async parse(buf) {
    // For demonstration purposes we simply treat the entire file as text.
    const text = buf.toString('utf8');
    return {
      id: 'csv-' + Math.random().toString(36).slice(2, 10),
      filename: 'unknown.csv',
      mimetype: 'text/csv',
      text,
    };
  },
};

export default csvParserPlugin;
