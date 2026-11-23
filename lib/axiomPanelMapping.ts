/**
 * Axiom → panel mapping for the Codex orb.
 *
 * Each of the six axiom nodes on the orb opens a real panel — the same
 * panel-open path the dock uses (App.handleAppClick). Every value must be
 * a real PANEL_DEFINITIONS id (constants.ts); the mapping test
 * (services/axiom_panel_mapping_test.ts) enforces this.
 *
 * History: the N10 fix (2026-11-22) wired axiom taps to a model-generated
 * "Tactical Brief" instead. The brief needs a model and posts into a closed
 * echo feed, so it was invisible in the default no-model state and never
 * opened a panel. The orb-click fix (2026-11-23) drops the brief from the
 * tap path and opens the mapped panel directly; the brief survives only as
 * the "Tactical Brief (AI)" button on an already-open panel.
 */

// Axiom label → PANEL_DEFINITIONS id.
export const AXIOM_PANEL_MAP: Record<string, string> = {
  Network: 'EmergentLogicWeb', // Interconnectivity — the live web of glyphs/axioms
  Security: 'TraitGatePanel', // Boundary logic / trait shielding — trait gates
  'Data Streams': 'CosmicResonanceDashboardPanel', // Live signal/stream monitoring
  Archive: 'DriftArchivePanel', // Lore shard / drift archive
  Analytics: 'EntropyDiagnosticsPanel', // Drift + entropy analytics
  Status: 'SystemHealthPanel', // System health / resonance status
};

/** Resolve an axiom node's label to the panel it opens, or undefined. */
export function resolveAxiomPanelId(axiomLabel: string): string | undefined {
  return AXIOM_PANEL_MAP[axiomLabel];
}

/**
 * Tap tolerance for axiom nodes, in orb world units.
 *
 * The nodes are small (radius 0.8) and orbit at radius 15 with angular
 * speed 0.1 rad/s — about 1.5 units/s, roughly 150 px/s on screen at
 * 1920 px wide. A tap aimed from a ~1 s-old screenshot can miss the mesh
 * by two node diameters, so a ray that passes within this distance of a
 * node's current world position counts as a tap on that node. Must stay
 * larger than the node radius (0.8) and far smaller than the orbit
 * radius (15) so it can never steal a core-orb tap (the core orb is
 * radius 5 at the origin; the proximity fallback for it is 6.5).
 */
export const AXIOM_TAP_TOLERANCE_UNITS = 2.5;
