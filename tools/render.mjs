import { marked } from '/workspace/tools/node_modules/marked/lib/marked.esm.js';
import fs from 'fs';
const dir = '/workspace/space-apps-prototype';
let md = fs.readFileSync(`${dir}/BUILD_GUIDE.md`, 'utf8');
md = md.replace(/```mermaid[\s\S]*?```/, '<figure class="diagram"><img src="assets/pipeline.svg" alt="Pipeline diagram"/><figcaption>Figure 1. Field Shift pipeline (rendered from the Mermaid source in BUILD_GUIDE.md)</figcaption></figure>');
const body = marked.parse(md, { gfm: true });
const css = `
@page { size: A4; margin: 16mm 14mm 16mm 14mm; }
body { font-family: "Inter","Segoe UI","Noto Sans","Noto Sans Bengali",Arial,sans-serif; font-size: 10pt; line-height: 1.5; color: #1d2433; }
h1 { font-size: 22pt; color: #0b3d91; margin: 0 0 4pt; border-bottom: 3px solid #0b3d91; padding-bottom: 4pt; }
h2 { font-size: 15pt; color: #0b3d91; margin-top: 20pt; border-bottom: 1px solid #c9d3e6; padding-bottom: 3pt; page-break-after: avoid; }
h3 { font-size: 12pt; color: #223; margin-top: 14pt; page-break-after: avoid; }
p, li { orphans: 3; widows: 3; }
a { color: #0b61d8; text-decoration: none; word-break: break-word; }
blockquote { margin: 8pt 0; padding: 8pt 12pt; background: #f2f6fc; border-left: 4px solid #0b3d91; font-style: italic; }
table { border-collapse: collapse; width: 100%; margin: 8pt 0; font-size: 8.3pt; page-break-inside: auto; }
tr { page-break-inside: avoid; }
th { background: #eef2f8; text-align: left; font-weight: 600; }
th, td { border: 1px solid #d5dbe6; padding: 3pt 5pt; vertical-align: top; }
code { font-family: "JetBrains Mono","DejaVu Sans Mono",monospace; font-size: 8.3pt; background: #f4f5f7; padding: 0 2pt; border-radius: 2pt; }
pre { background: #f6f8fa; border: 1px solid #e1e4e8; border-radius: 4pt; padding: 7pt 9pt; font-size: 7.8pt; line-height: 1.35; white-space: pre-wrap; word-break: break-word; page-break-inside: avoid; }
pre code { background: none; padding: 0; font-size: inherit; }
figure.diagram { margin: 10pt 0; text-align: center; page-break-inside: avoid; }
figure.diagram img { width: 100%; max-height: 120mm; object-fit: contain; }
figcaption { font-size: 8.5pt; color: #667; margin-top: 4pt; }
hr { border: none; border-top: 1px solid #e3e7ef; margin: 14pt 0; }
input[type=checkbox] { margin-right: 4pt; }
`;
fs.writeFileSync(`${dir}/BUILD_GUIDE.html`, `<!doctype html><html><head><meta charset="utf-8"><title>Field Shift Build Guide</title><style>${css}</style></head><body>${body}</body></html>`);
console.log('html written');
