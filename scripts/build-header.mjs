// Builds assets/header-{dark,light}.svg. Static content; rerun by hand if the facts change.
import {writeFile, mkdir} from 'node:fs/promises';

const THEMES = {
  dark: {bg1: '#0b0f19', bg2: '#111827', title: '#f8fafc', text: '#cbd5e1', muted: '#94a3b8', card: '#ffffff', cardA: 0.04, cardStroke: '#ffffff', cardStrokeA: 0.10, orbA: 0.55},
  light: {bg1: '#f8fafc', bg2: '#eef2ff', title: '#0f172a', text: '#334155', muted: '#64748b', card: '#ffffff', cardA: 0.85, cardStroke: '#0f172a', cardStrokeA: 0.08, orbA: 0.30},
};

const words = ['grounded', 'evaluation-first', 'measured'];
const cards = [
  {value: '5 merged PRs', label: 'GRASS GIS · up to ~4.7× speedup'},
  {value: 'Finalist', label: 'Meta PyTorch × OpenEnv Hackathon'},
  {value: 'AI Eng. Intern', label: 'Thriftstone · Jul – Oct 2026'},
];

function svg(t) {
  const W = 1200, H = 360;
  const rot = words.map((w, i) => `
    <text x="60" y="238" class="tag w w${i}">I build <tspan class="grad">${w}</tspan> AI systems.</text>`).join('');
  const cardEls = cards.map((c, i) => {
    const y = 52 + i * 92;
    return `
  <g class="card" style="animation-delay:${0.3 + i * 0.15}s">
    <rect x="770" y="${y}" width="380" height="80" rx="14" fill="${t.card}" fill-opacity="${t.cardA}" stroke="${t.cardStroke}" stroke-opacity="${t.cardStrokeA}"/>
    <rect x="770" y="${y + 18}" width="4" height="40" rx="2" fill="url(#g)"/>
    <text x="794" y="${y + 35}" class="cv">${c.value}</text>
    <text x="794" y="${y + 61}" class="cl">${c.label}</text>
  </g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Vinay Kumar Chopra, AI engineer. I build grounded, evaluation-first AI systems.">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg1}"/><stop offset="1" stop-color="${t.bg2}"/></linearGradient>
    <linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#7c3aed"/><stop offset=".5" stop-color="#2563eb"/><stop offset="1" stop-color="#06b6d4"/></linearGradient>
    <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="60"/></filter>
    <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="${t.muted}" stroke-opacity=".08"/></pattern>
    <clipPath id="clip"><rect width="${W}" height="${H}" rx="18"/></clipPath>
  </defs>
  <style>
    text{font-family:'Segoe UI',Ubuntu,'Helvetica Neue',Arial,sans-serif}
    .eyebrow{font:600 16px ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.18em;fill:${t.muted}}
    .name{font-size:62px;font-weight:800;fill:${t.title};letter-spacing:-.02em}
    .tag{font-size:30px;font-weight:500;fill:${t.text}}
    .grad{fill:url(#g);font-weight:700}
    .meta{font-size:18px;fill:${t.muted}}
    .cv{font-size:23px;font-weight:700;fill:${t.title}}
    .cl{font-size:16px;fill:${t.muted}}
    .w{opacity:0;animation:cycle 9s infinite}
    .w1{animation-delay:3s}.w2{animation-delay:6s}
    @keyframes cycle{0%{opacity:0;transform:translateY(8px)}4%,30%{opacity:1;transform:none}34%,100%{opacity:0;transform:translateY(-8px)}}
    .o1{animation:drift1 14s ease-in-out infinite alternate}
    .o2{animation:drift2 18s ease-in-out infinite alternate}
    @keyframes drift1{to{transform:translate(120px,40px)}}
    @keyframes drift2{to{transform:translate(-140px,-30px)}}
    .card{opacity:0;animation:rise .7s cubic-bezier(.2,.8,.2,1) forwards}
    @keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
    .line{stroke-dasharray:240;stroke-dashoffset:240;animation:draw 1.2s .2s ease forwards}
    @keyframes draw{to{stroke-dashoffset:0}}
    .cursor{animation:blink 1s steps(1) infinite}
    @keyframes blink{50%{opacity:0}}
    @media (prefers-reduced-motion:reduce){.w,.o1,.o2,.card,.line,.cursor{animation:none}.w0,.card{opacity:1}.line{stroke-dashoffset:0}}
  </style>
  <g clip-path="url(#clip)">
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#grid)"/>
    <circle class="o1" cx="260" cy="80" r="170" fill="#7c3aed" fill-opacity="${t.orbA}" filter="url(#blur)"/>
    <circle class="o2" cx="980" cy="300" r="190" fill="#06b6d4" fill-opacity="${t.orbA}" filter="url(#blur)"/>
  </g>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="18" fill="none" stroke="${t.muted}" stroke-opacity=".25"/>
  <text x="60" y="96" class="eyebrow">&gt; AI ENGINEER · OPEN SOURCE · BITS PILANI<tspan class="cursor">_</tspan></text>
  <text x="58" y="170" class="name">Vinay Kumar Chopra</text>
  <line x1="60" x2="300" y1="192" y2="192" stroke="url(#g)" stroke-width="4" stroke-linecap="round" class="line"/>
  ${rot}
  <text x="60" y="294" class="meta">RAG · agents · evals  —  every claim links to where you can check it.</text>
  ${cardEls}
</svg>
`;
}

await mkdir('assets', {recursive: true});
for (const [name, t] of Object.entries(THEMES)) await writeFile(`assets/header-${name}.svg`, svg(t));
console.log('header written');
