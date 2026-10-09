import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateModelReview, renderModelReview } from '../src/system-model-review.mjs';

const args = process.argv.slice(2);
const value = flag => { const i = args.indexOf(flag); if (i < 0 || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Required ' + flag); return args[i + 1]; };
const mappings = flag => Object.fromEntries(args.flatMap((arg, i) => { if (arg !== flag) return []; const raw = args[i + 1] ?? ''; const at = raw.indexOf('='); if (at < 1 || at === raw.length - 1) throw new Error('Expected ' + flag + ' REPOSITORY=VALUE'); return [[raw.slice(0, at), raw.slice(at + 1)]]; }));
const result = validateModelReview({ surfacePath: value('--surface'), companyRepo: resolve(value('--company-repo')), companyRevision: value('--company-sha'), repositories: mappings('--source-repo'), subjects: mappings('--subject-revision'), python: args.includes('--python') ? value('--python') : 'python3' });
const output = resolve(value('--output'));
mkdirSync(output, { recursive: true });
writeFileSync(resolve(output, 'index.html'), renderModelReview(result));
writeFileSync(resolve(output, 'surface.json'), JSON.stringify(result.surface, null, 2) + '\n');
writeFileSync(resolve(output, 'source-check.json'), JSON.stringify({ ...result.check, validatorRevision: result.validatorRevision }, null, 2) + '\n');
console.log(JSON.stringify({ outcome: 'passed', exit_status: 0, sources: result.surface.source_records.map(s => s.source_id), output }));
