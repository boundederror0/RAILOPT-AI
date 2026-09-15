const path = require("node:path");
const fs = require("node:fs");
const ROOT = "E:\\RAILOPT";
const OUT = path.join(ROOT, "scripts", ".verify", "out");
function load(mod){const c=[path.join(OUT,mod+".js"),path.join(OUT,mod+".cjs")];for(const f of c){if(fs.existsSync(f)){try{return require(f)}catch(e){}}}return{}}
const postings = load("postings");
const roleProfiles = load("role-profiles");
for (const p of postings.POSTINGS ?? []) {
  const perms = p.permissions ?? roleProfiles.ROLE_PROFILES?.[p.roleProfileId]?.permissions ?? [];
  const view = perms.includes("simulation.view");
  const run = perms.includes("simulation.run");
  const approve = perms.includes("approvals.approve");
  console.log(`${p.id.padEnd(8)} view=${view} run=${run} approve=${approve}`);
}
