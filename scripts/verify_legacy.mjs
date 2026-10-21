import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
// Check against the first local commit, which contains only the untouched legacy hall.
const baseline = execFileSync('git', ['rev-list', '--max-parents=0', 'HEAD'], { encoding: 'utf8' }).trim();
const files = [];
function visit(path) {
  if (statSync(path).isDirectory()) for (const entry of readdirSync(path)) visit(join(path,entry));
  else files.push(path);
}
for (const path of ['index.html','LEIA-ME.txt','js','css','assets']) visit(path);
for (const path of files) {
  // git diff compares normalized text; binary assets are additionally hashed byte-for-byte.
  execFileSync('git',['diff','--exit-code',baseline,'--',path]);
  if (path.endsWith('.png')) {
    const saved = execFileSync('git',['show',`${baseline}:${path.replaceAll('\\','/')}`], { maxBuffer: Math.max(1024 * 1024, statSync(path).size * 2) });
    const hash = value => createHash('sha256').update(value).digest('hex');
    assert.equal(hash(readFileSync(path)),hash(saved),`${path} changed`);
  }
}
console.log(`Legacy unchanged: ${files.length} files; PNG SHA-256 matches baseline ${baseline.slice(0,7)}.`);
