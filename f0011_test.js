#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  FunebraRegistry,
  lockViewFromExport,
  lockViewFingerprint,
  stableStringify,
  F0009_FINGERPRINT,
} = require('./funebra_registry.js');

const ROOT = __dirname;
const X = JSON.parse(fs.readFileSync(path.join(ROOT, 'f0009_funebra_export.json'), 'utf8'));

const results = [];
function check(name, cond, detail) {
  results.push({ name, pass: !!cond, detail: String(detail) });
}

const reg = new FunebraRegistry();
const handle = reg.loadRegistry(X);
check('load succeeds', handle.loaded === true, JSON.stringify(handle));
check('load does not render', handle.rendered === false && reg.wasRendered() === false, handle.rendered);

const Y = reg.exportRegistry();
check('export equals load input (deep)', stableStringify(X) === stableStringify(Y), 'canonical X == Y');

const v = reg.validateRegistry(Y);
check('validate export', v.ok, v.errors.join(',') || 'ok');
check('9 nodes', Y.points.length === 9, Y.points.length);
check('8 relations', Y.relations.length === 8, Y.relations.length);
check('ids survive', Y.points.map(p => p.id).join(',') ===
  'BN_hair_L,BN_eye_L,BN_eye_R,BN_nose,BN_lips,BN_jaw,BN_necklace,BN_hand,BN_hair_R',
  Y.points.map(p => p.id).join(','));
check('bn0..bn8 survive', Y.points.map(p => p.bn).join(',') ===
  'bn0,bn1,bn2,bn3,bn4,bn5,bn6,bn7,bn8',
  Y.points.map(p => p.bn).join(','));
check('BN_jaw weak_implied', Y.points.find(p => p.id === 'BN_jaw').status === 'weak_implied',
  Y.points.find(p => p.id === 'BN_jaw').status);
check('no contour permission', Y.relations.every(r => r.draws_contour === false), 'all false');
check('source photograph', Y.source_photograph === '20170606_090825-_- LeLaDeres.jpg', Y.source_photograph);

let plotRejected = false;
try { reg.asPlotBN(); } catch (e) { plotRejected = /PlotBN/.test(e.message); }
check('PlotBN ≠ RegistryBN enforced', plotRejected, 'asPlotBN rejected');

fs.writeFileSync(path.join(ROOT, 'f0011_export_roundtrip.json'), JSON.stringify(Y, null, 2));
const { spawnSync } = require('child_process');
const py = spawnSync('python3', [path.join(ROOT, 'f0011_fingerprint.py')], {
  encoding: 'utf8',
});
const fp = (py.stdout || '').trim();
check('F-0009 fingerprint recovered', fp === F0009_FINGERPRINT, fp || py.stderr);

const passed = results.every(r => r.pass);

const report = [];
report.push('# F-0011 — Evidence-Preserving BN Registry Interface');
report.push('');
report.push(`**Result: ${passed ? 'PASS' : 'FAIL'}**`);
report.push('');
report.push('Invariant:');
report.push('');
report.push('\\[');
report.push('\\mathrm{loadRegistry}(X) \\rightarrow \\mathrm{exportRegistry}() = X');
report.push('\\]');
report.push('');
report.push('Type separation: `PlotBN ≠ RegistryBN`. Load does not render.');
report.push('');
report.push('F-0010 FAIL is retained. This milestone does not overwrite it.');
report.push('');
report.push(`- recovered lock-view SHA-256: \`${fp}\``);
report.push(`- expected F-0009 fingerprint: \`${F0009_FINGERPRINT}\``);
report.push('- implementation: `funebra_registry.js`');
report.push('');
report.push('| condition | result | detail |');
report.push('|-----------|--------|--------|');
for (const r of results) {
  report.push(`| ${r.name} | ${r.pass ? 'PASS' : 'FAIL'} | \`${r.detail.replace(/\|/g, '/')}\` |`);
}
report.push('');
report.push('r0.1 remains CLOSED. F-0010R remains BLOCKED until this interface exists on the published runtime.');
report.push('');

fs.writeFileSync(path.join(ROOT, 'F-0011_REPORT.md'), report.join('\n'));
console.log(passed ? 'PASS' : 'FAIL');
for (const r of results) console.log((r.pass ? 'PASS' : 'FAIL'), r.name, r.detail);
process.exit(passed ? 0 : 1);
