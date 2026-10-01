# Personal Sign — Third-Party Runtime Notices

Runtime bundle: 1.7

All runtime libraries are stored under `personal-sign/vendor/` and are served from the same origin as Personal Sign. No executable JavaScript is loaded from third-party CDNs at runtime.

| Component | Version | Local file | License | Upstream / artifact source |
|---|---:|---|---|---|
| JSZip | 3.10.1 | `vendor/jszip-3.10.1.min.js` | MIT / GPLv3 dual license | Stuk/jszip, tag v3.10.1, `dist/jszip.min.js` |
| docx-preview | 0.4.1 | `vendor/docx-preview-0.4.1.min.js` | Apache-2.0 | VolodymyrBaydalka/docxjs, `dist/docx-preview.min.js` |
| html2canvas | 1.4.1 | `vendor/html2canvas-1.4.1.min.js` | MIT | upstream build mirrored in gopro/labs `docs/html2canvas.min.js` |
| pdf-lib | 1.17.1 | `vendor/pdf-lib-1.17.1.min.js` | MIT | upstream pdf-lib build mirrored in mohitpaddhariya/PESUmate `lib/pdf-lib.min.js` |
| PDF.js | 2.9.359 | `vendor/pdfjs-2.9.359.min.js` | Apache-2.0 | mozilla/pdfjs-dist tag v2.9.359 `build/pdf.min.js` |
| PDF.js worker | 2.9.359 | `vendor/pdfjs-worker-2.9.359.min.js` | Apache-2.0 | mozilla/pdfjs-dist tag v2.9.359 `build/pdf.worker.min.js` |
| docToText | 0.1.0 | `vendor/docToText-0.1.0.js` | 0BSD | Alpaq92/JSDoc `src/docToText.js` |

## Runtime isolation

Personal Sign 1.7 uses:
- `script-src 'self'`;
- `connect-src 'none'`;
- same-origin PDF.js worker;
- a service worker that rejects cross-origin fetches.

This file is a notice, not a replacement for the upstream license texts retained in the respective distributed files/repositories.
