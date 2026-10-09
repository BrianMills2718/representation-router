import test from 'node:test';
import assert from 'node:assert/strict';
import { renderModelReview, validateModelReview } from '../src/system-model-review.mjs';

test('renderer refuses unvalidated sources', () => {
  assert.throws(() => renderModelReview({ surface: {}, check: { valid: false } }), /Validated/);
});

test('consumer requires an exact owning validator revision before any execution', () => {
  assert.throws(() => validateModelReview({ companyRevision: 'main' }), /Full Company Planning/);
});

test('read-only renderer preserves source identity, relationship meaning and scope limits', () => {
  const surface = {
    review_intent: { prompt: 'What crosses the boundary?' },
    nodes: [{ node_id: 'input', label: '<Input>', kind: 'source' }, { node_id: 'output', label: 'Decision', kind: 'artifact' }],
    ports: [{ port_id: 'out', node_id: 'input' }, { port_id: 'in', node_id: 'output' }],
    edges: [{ edge_id: 'crossing', from_port: 'out', to_port: 'in', label: 'Checked evidence' }],
    source_records: [{ source_id: 'model', repository: 'fixture/model', commit_sha: 'a'.repeat(40), path: 'model.md' }],
    provenance_bindings: [{ target_ref: 'node:input', input_source_refs: [{ source_id: 'model', source_pointer: '/boundary' }] }],
    evidence_claims: [{ claim: 'Partial source model. No behavior observation.' }]
  };
  const html = renderModelReview({ surface, check: { valid: true }, validatorRevision: 'b'.repeat(40) });
  assert.match(html, /&lt;Input&gt;/);
  assert.match(html, /Partial source model\. No behavior observation\./);
  assert.match(html, /fixture\/model\/blob\/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\/model.md/);
  assert.match(html, /data-node="input"/);
  assert.match(html, /Checked/);
  assert.match(html, /evidence/);
  assert.match(html, /Read only/);
});
