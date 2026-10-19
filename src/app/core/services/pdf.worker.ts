// Entry of the pdf.js worker. `new Worker(new URL('./pdf.worker', import.meta.url))` makes the
// Angular builder bundle it as a hashed `worker-*.js` served from 'self' (Spec 006 plan D3).
import 'pdfjs-dist/build/pdf.worker.mjs';
