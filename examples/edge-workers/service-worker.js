// Minimal example of using MixContext inside a Service / Edge Worker
// Compatible with Cloudflare Workers, Deno Deploy, Fastly, etc.

// Import the IIFE build
importScripts('https://cdn.jsdelivr.net/npm/@mixcontext/core/dist/index.iife.js');

// The global `mixcontext` object is now available – pull out the helpers you need
const { parseFile } = self.mixcontext;

self.addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // For demo purposes we expect the request body to be a PDF/HTML/etc.
  const arrayBuffer = await request.arrayBuffer();
  const doc = await parseFile(Buffer.from(arrayBuffer));

  return new Response(JSON.stringify(doc, null, 2), {
    headers: { 'content-type': 'application/json' },
  });
}
