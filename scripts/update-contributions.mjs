// Regenerates the open-source section of README.md and the contribution cards in assets/
// from live GitHub data: pull requests authored by USER in repositories USER does not own.
// Runs in GitHub Actions (see .github/workflows/profile.yml). No dependencies; Node 20+.
import {readFile, writeFile, mkdir} from 'node:fs/promises';

const USER = process.env.GH_USER || 'HUN-sp';
const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) throw new Error('GITHUB_TOKEN is required');

const QUERY = `query($q:String!,$after:String){
  search(query:$q,type:ISSUE,first:100,after:$after){
    pageInfo{hasNextPage endCursor}
    nodes{... on PullRequest{
      number title url createdAt mergedAt
      repository{nameWithOwner url stargazerCount isPrivate owner{login avatarUrl}}
    }}
  }
}`;

async function search(q) {
  const out = [];
  let after = null;
  do {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {Authorization: `bearer ${TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'profile-readme'},
      body: JSON.stringify({query: QUERY, variables: {q, after}}),
    });
    const json = await res.json();
    if (!res.ok || json.errors) throw new Error(`GitHub API error: ${JSON.stringify(json.errors || json)}`);
    const {nodes, pageInfo} = json.data.search;
    out.push(...nodes.filter(n => n?.repository && !n.repository.isPrivate));
    after = pageInfo.hasNextPage ? pageInfo.endCursor : null;
  } while (after);
  return out;
}

const merged = await search(`author:${USER} is:pr is:merged -user:${USER}`);
const open = await search(`author:${USER} is:pr is:open -user:${USER} archived:false`);
merged.sort((a, b) => b.mergedAt.localeCompare(a.mergedAt));
open.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

// Group merged PRs by repository; most PRs first, then most stars.
const repos = new Map();
for (const pr of merged) {
  const r = pr.repository;
  if (!repos.has(r.nameWithOwner)) repos.set(r.nameWithOwner, {...r, prs: []});
  repos.get(r.nameWithOwner).prs.push(pr);
}
const repoList = [...repos.values()].sort((a, b) => b.prs.length - a.prs.length || b.stargazerCount - a.stargazerCount);
const since = merged.length ? merged[merged.length - 1].mergedAt.slice(0, 4) : '—';
const today = new Date().toISOString().slice(0, 10);

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const md = s => String(s).replace(/\|/g, '\\|').replace(/</g, '&lt;').replace(/\r?\n/g, ' ');
const stars = n => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n));
const month = iso => new Date(iso).toLocaleDateString('en-US', {month: 'short', year: 'numeric', timeZone: 'UTC'});

// ---------- README section ----------
const lines = [];
lines.push(`| Repository | ⭐ Stars | Merged PRs | Latest merge |`);
lines.push(`|:--|--:|--:|:--|`);
for (const r of repoList) {
  lines.push(`| <img src="${r.owner.avatarUrl}&s=40" width="16" height="16" align="center"> [${r.nameWithOwner}](${r.url}) | ${stars(r.stargazerCount)} | **${r.prs.length}** | ${month(r.prs[0].mergedAt)} |`);
}
lines.push('');
lines.push(`<details>`);
lines.push(`<summary><b>All ${merged.length} merged pull requests</b> (newest first)</summary>`);
lines.push('');
for (const pr of merged) {
  lines.push(`- \`${pr.mergedAt.slice(0, 10)}\` **${pr.repository.nameWithOwner}** · [#${pr.number}](${pr.url}) ${md(pr.title)}`);
}
lines.push('');
lines.push(`</details>`);
if (open.length) {
  lines.push('');
  lines.push(`<details>`);
  lines.push(`<summary><b>${open.length} pull request${open.length === 1 ? '' : 's'} currently in review</b></summary>`);
  lines.push('');
  for (const pr of open) {
    lines.push(`- **${pr.repository.nameWithOwner}** · [#${pr.number}](${pr.url}) ${md(pr.title)}`);
  }
  lines.push('');
  lines.push(`</details>`);
}
lines.push('');
lines.push(`<sub>Auto-generated from the GitHub API by a scheduled workflow · counts only PRs to repositories I don't own · last updated ${today}</sub>`);

const START = '<!-- CONTRIBUTIONS:START -->';
const END = '<!-- CONTRIBUTIONS:END -->';
const readme = await readFile('README.md', 'utf8');
const s = readme.indexOf(START), e = readme.indexOf(END);
if (s < 0 || e < s) throw new Error('README markers not found');
await writeFile('README.md', `${readme.slice(0, s + START.length)}\n${lines.join('\n')}\n${readme.slice(e)}`);

// ---------- SVG card ----------
const THEMES = {
  dark: {bg: '#0d1117', border: '#30363d', title: '#e6edf3', text: '#c9d1d9', muted: '#8b949e', track: '#21262d', a: '#7c3aed', b: '#06b6d4'},
  light: {bg: '#ffffff', border: '#d0d7de', title: '#1f2328', text: '#24292f', muted: '#57606a', track: '#eaeef2', a: '#7c3aed', b: '#0891b2'},
};
function card(t) {
  const top = repoList.slice(0, 6);
  const max = Math.max(1, ...top.map(r => r.prs.length));
  const W = 840, rowH = 30, barX = 330, barW = 400;
  const H = 196 + top.length * rowH + 16;
  const stat = (x, value, label) => `
    <g transform="translate(${x},96)">
      <text class="num" y="0">${esc(value)}</text>
      <text class="lbl" y="24">${esc(label)}</text>
    </g>`;
  const rows = top.map((r, i) => {
    const y = 196 + i * rowH;
    const w = Math.max(8, Math.round((r.prs.length / max) * barW));
    return `
    <g transform="translate(0,${y})" style="animation-delay:${0.15 + i * 0.1}s" class="row">
      <text x="32" y="0" class="repo">${esc(r.nameWithOwner)}</text>
      <text x="${barX - 14}" y="0" class="star" text-anchor="end">★ ${esc(stars(r.stargazerCount))}</text>
      <rect x="${barX}" y="-12" width="${barW}" height="14" rx="7" fill="${t.track}"/>
      <rect x="${barX}" y="-12" width="${w}" height="14" rx="7" fill="url(#g)" class="bar" style="animation-delay:${0.2 + i * 0.1}s"/>
      <text x="${barX + barW + 14}" y="0" class="cnt">${r.prs.length}</text>
    </g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`${merged.length} merged pull requests to ${repoList.length} repositories I don't own`)}">
  <defs>
    <linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="${t.a}"/><stop offset="1" stop-color="${t.b}"/></linearGradient>
  </defs>
  <style>
    text{font-family:'Segoe UI',Ubuntu,'Helvetica Neue',Arial,sans-serif;fill:${t.text}}
    .h{font-size:20px;font-weight:700;fill:${t.title}}
    .sub{font-size:13px;fill:${t.muted}}
    .num{font-size:34px;font-weight:800;fill:url(#g)}
    .lbl{font-size:12px;fill:${t.muted};letter-spacing:.06em;text-transform:uppercase}
    .repo{font-size:14px;font-weight:600}
    .star{font-size:12px;fill:${t.muted}}
    .cnt{font-size:14px;font-weight:700}
    .row{opacity:0;animation:fade .5s ease forwards}
    .bar{transform-box:fill-box;transform-origin:left;transform:scaleX(0);animation:grow .9s cubic-bezier(.2,.8,.2,1) forwards}
    .dot{animation:pulse 2s ease-in-out infinite}
    @keyframes fade{to{opacity:1}}
    @keyframes grow{to{transform:scaleX(1)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}
  </style>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="${t.bg}" stroke="${t.border}"/>
  <text x="32" y="40" class="h">Open-source contributions</text>
  <circle cx="${W - 160}" cy="35" r="5" fill="#2ea043" class="dot"/>
  <text x="${W - 148}" y="40" class="sub">live · ${esc(today)}</text>
  ${stat(32, merged.length, 'merged PRs')}
  ${stat(232, repoList.length, 'repositories')}
  ${stat(432, since, 'contributing since')}
  ${stat(632, open.length, 'in review')}
  <line x1="32" x2="${W - 32}" y1="144" y2="144" stroke="${t.border}"/>
  <text x="32" y="170" class="sub">Merged PRs per repository</text>
  ${rows}
</svg>
`;
}
await mkdir('assets', {recursive: true});
for (const [name, theme] of Object.entries(THEMES)) await writeFile(`assets/contributions-${name}.svg`, card(theme));

console.log(`merged=${merged.length} repos=${repoList.length} since=${since} open=${open.length}`);
