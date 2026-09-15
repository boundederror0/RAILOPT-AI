// One-off migration: exact quoted policy-permission renames across src/**/*.{ts,tsx}.
// Map mirrors LEGACY_PERMISSION_RENAMES (src/lib/rbac/permissions.ts). Exact-string only
// — paths like "/(dashboard)/live-operations" and prose hyphens are NOT touched.
const RENAMES = {
  "ai-analysis.view": "ai_analysis.view",
  "ai-analysis.run": "ai_analysis.run",
  "train-impact.view": "train_impact.view",
  "live-operations.view": "live_operations.view",
  "live-operations.monitor": "live_operations.monitor",
  "live-operations.coordinate": "live_operations.coordinate",
  "approval.view": "approvals.view",
  "approval.recommend": "approvals.recommend",
  "approval.approve": "approvals.approve",
};
// Same names left as-is (single-word modules stay single word in FINAL):
// optimizer.view/.run/.recommend, simulation.view/.run, emergency.view/.create/.recommend,
// analytics.view, historical.view, settings.view. Not in map.

const fs = require("fs");
const path = require("path");

const ROOT = "E:/RAILOPT/src";
const EXTS = new Set([".ts", ".tsx"]);

function walk(dir, out = []) {
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (EXTS.has(path.extname(e.name))) out.push(p);
    }
  } catch {}
  return out;
}

const files = walk(ROOT);
let totalFiles = 0;
let totalReplacements = 0     ;
const details = [];
const changeLog = [];

for (const f of files) {
  const orig = fs.readFileSync(f, "utf8");
  let text = orig;
  let changes = 0;
  const hits = {};
  for (const [oldId, newId] of Object.entries(RENAMES)) {
    let idx = text.indexOf(oldId);
    while (idx !== -1) {
      text = text.slice(0, idx) + newId + text.slice(idx + oldId.length);
      changes++;
      hits[oldId] = (hits[oldId] || 0) + 1;
      idx = text.indexOf(oldId, idx + newId.length);
    }
  }
  if (changes > 0) {
    fs.writeFileSync(f, text, "utf8");
    totalFiles++;
    totalReplacements += changes;
    const tag = f.replace(ROOT, "").replace(/\\/g, "/");
    const parts = Object.entries(hits)
      .map(([k, n]) => `${k}=>${RENAMES[k]}(x${n})`)
      .join(" ");
    changeLog.push(`${tag} :: ${parts}`);
    details.push(`- ${tag} (${changes})`);
  }
}

const summary = [
  `Total files changed: ${totalFiles}`,
  `Total replacements: ${totalReplacements}`,
  "",
  "CHANGELOG",
  ...changeLog,
].join("\n");

fs.writeFileSync(path.join(__dirname, "migration-report.txt"), summary, "utf8");
console.log(summary);
