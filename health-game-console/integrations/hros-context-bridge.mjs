/**
 * HROS -> Health Game Console safe local preview adapter.
 * Never reads browser storage, calls a network API, or mutates HROS.
 * This is NOT the production authorization mechanism.
 */
const ALLOWED_KINDS = new Set(['fact','perspective','action','observation','verification','pattern']);
const CONFIRMED = new Set(['confirmed','finalized']);
const ID = /^[a-zA-Z0-9_-]{1,96}$/;
const empty = (reason) => ({
  schemaVersion: 'hgc.hros-context.v1',
  sourceProduct: 'HROS',
  state: 'blocked',
  reason,
  projection: [],
  requiresReview: true
});
export function prepareHrosContextPreview(snapshot, approval, options = {}) {
  const at = options.now instanceof Date ? options.now : new Date();
  if (!snapshot || snapshot.meta?.schemaVersion !== '1.0.0' || !Array.isArray(snapshot.records)) {
    return empty('HROS_SNAPSHOT_INVALID');
  }
  if (!approval || approval.status !== 'confirmed' || approval.target !== 'health-game-console' ||
      approval.purpose !== 'contextualize_wellbeing' || approval.revokedAt ||
      !ID.test(String(approval.ownerId || '')) || !Array.isArray(approval.allowedRecordIds) ||
      !Number.isFinite(Date.parse(String(approval.confirmedAt || ''))) ||
      !Number.isFinite(Date.parse(String(approval.expiresAt || ''))) ||
      new Date(approval.expiresAt) <= at || new Date(approval.confirmedAt) > at) {
    return empty('EXPLICIT_APPROVAL_REQUIRED');
  }
  const ids = new Set(approval.allowedRecordIds.filter(id => typeof id === 'string' && ID.test(id)));
  const projection = [];
  for (const r of snapshot.records) {
    if (!r || !ids.has(r.id) || r.visibility !== 'private' ||
        !CONFIRMED.has(r.status) || !ALLOWED_KINDS.has(r.kind)) continue;
    // A perspective explicitly owned by someone else must never cross this boundary.
    if (r.perspectiveOwnerId && r.perspectiveOwnerId !== approval.ownerId) continue;
    if (!Number.isInteger(r.version) || r.version < 1) continue;
    const sourceDate = r.updatedAt || r.createdAt;
    if (typeof sourceDate !== 'string' || !Number.isFinite(Date.parse(sourceDate))) continue;
    // Only coarse category, calendar day and the record reference: no names,
    // statement, emotion text, people, relationship IDs, source label or raw transcript.
    projection.push(Object.freeze({
      ref: r.id,
      kind: r.kind,
      date: new Date(sourceDate).toISOString().slice(0, 10),
      version: r.version,
      status: r.status,
      sourceKind: String(r.source?.kind || 'unknown').slice(0, 30)
    }));
  }
  return {
    schemaVersion: 'hgc.hros-context.v1',
    sourceProduct: 'HROS',
    state: 'review_only',
    projection,
    requiresReview: true,
    sourceMutated: false,
    transferAuthorized: false // production requires server-side authorization
  };
}
