/**
 * Funebra F-0011 — Evidence-Preserving BN Registry
 *
 * PlotBN  ≠  RegistryBN
 * PlotBN    : parametric step index (existing engine bn0…bnN)
 * RegistryBN: evidence-bearing landmark (this module)
 *
 * Loading a registry MUST NOT render.
 */
'use strict';

const REQUIRED_IDS = [
  'BN_hair_L', 'BN_eye_L', 'BN_eye_R', 'BN_nose', 'BN_lips',
  'BN_jaw', 'BN_necklace', 'BN_hand', 'BN_hair_R',
];
const REQUIRED_BN = ['bn0','bn1','bn2','bn3','bn4','bn5','bn6','bn7','bn8'];
const F0009_FINGERPRINT =
  'bf32905405fe7a2f9e8f5304bbd0059ed44e3c8a43b8bf91477c866ea2697e9a';

function canonicalBytes(obj) {
  return Buffer.from(JSON.stringify(obj, Object.keys(obj).sort ? undefined : undefined));
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
}

function sha256Hex(str) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

function lockViewFromExport(exportObj) {
  // Field names must match F-0009 original_view exactly.
  return {
    source_photograph: exportObj.source_photograph,
    source_immutable: exportObj.source_immutable,
    points: exportObj.points.map(p => ({
      bn: p.bn,
      id: p.id,
      type: p.type,
      status: p.status,
      source: p.source,
      'locked_v0.2_grid': [p.x, p.y],
      'locked_v0.2_px': p.px,
      'observed_v0.1_grid': p.observed_v0_1_grid || p['observed_v0.1_grid'],
      contour_permission: p.contour_permission,
    })),
    relations: exportObj.relations.map(r => ({
      from: r.from,
      to: r.to,
      kind: r.kind,
      draws_contour: r.draws_contour,
    })),
    spine: exportObj.spine.slice(),
  };
}

function lockViewFingerprint(view) {
  return sha256Hex(stableStringify(view));
}

class FunebraRegistry {
  constructor() {
    this._data = null;
    this._rendered = false;
  }

  validateRegistry(obj) {
    const errors = [];
    if (!obj || obj.format !== 'funebra-bn-v0.2') errors.push('format');
    if (!obj.source_immutable) errors.push('source_immutable');
    if (obj.source_photograph !== '20170606_090825-_- LeLaDeres.jpg') {
      errors.push('source_photograph');
    }
    if (!Array.isArray(obj.points) || obj.points.length !== 9) errors.push('points.length');
    if (!Array.isArray(obj.relations) || obj.relations.length !== 8) errors.push('relations.length');
    const bns = (obj.points || []).map(p => p.bn);
    const ids = (obj.points || []).map(p => p.id);
    if (JSON.stringify(bns) !== JSON.stringify(REQUIRED_BN)) errors.push('bn ids');
    if (JSON.stringify(ids) !== JSON.stringify(REQUIRED_IDS)) errors.push('landmark ids');
    const jaw = (obj.points || []).find(p => p.id === 'BN_jaw');
    if (!jaw || jaw.status !== 'weak_implied') errors.push('BN_jaw status');
    if ((obj.relations || []).some(r => r.draws_contour)) errors.push('contour permission leaked');
    for (let i = 0; i < 8; i++) {
      const r = (obj.relations || [])[i];
      if (!r || r.from !== `bn${i}` || r.to !== `bn${i + 1}`) errors.push(`spine[${i}]`);
    }
    return { ok: errors.length === 0, errors };
  }

  loadRegistry(obj) {
    const v = this.validateRegistry(obj);
    if (!v.ok) {
      const err = new Error('Registry validation failed: ' + v.errors.join(', '));
      err.errors = v.errors;
      throw err;
    }
    this._data = JSON.parse(JSON.stringify(obj));
    this._rendered = false;
    return { loaded: true, rendered: false, vertices: 9, relations: 8 };
  }

  exportRegistry() {
    if (!this._data) throw new Error('no registry loaded');
    return JSON.parse(JSON.stringify(this._data));
  }

  wasRendered() {
    return this._rendered;
  }

  asPlotBN() {
    throw new Error('PlotBN ≠ RegistryBN: refuse to overload parametric step indices');
  }
}

module.exports = {
  FunebraRegistry,
  lockViewFromExport,
  lockViewFingerprint,
  stableStringify,
  F0009_FINGERPRINT,
  REQUIRED_IDS,
  REQUIRED_BN,
};
