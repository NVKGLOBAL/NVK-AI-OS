/**
 * Runtime capability registry — thin adapter (matrix program, 2026-11-27).
 *
 * The registrations now live in the canonical registry
 * (./CanonicalCapabilityRegistry.ts), which is the single source of truth
 * shared with the services registry. This module preserves the exact
 * runtime API — register / getCapability / getAll — projecting each
 * canonical entry into the runtime shape (src/nvk/types.ts NVKCapability:
 * available as a plain boolean, execute() returning the capability's own
 * result object, verify() passed through). Every existing import site
 * (ExecutionEngine, NVKRuntime, osNoModelAnswers, capability_gate_test,
 * os_web_search_test, os_documents_test) keeps working unchanged.
 *
 * The web.search and documents.create execute functions are Worker B's
 * rewiring (items 4–5, 2026-11-27) and live in the canonical module:
 * web.search calls lib/webSearch.ts, documents.create uses
 * services/DocumentStore.ts. They are preserved verbatim there.
 */
import { unifiedCapabilityRegistry, toRuntimeCapability } from './CanonicalCapabilityRegistry';
import type { NVKCapability as BaseCapability } from '../types';

export interface NVKCapabilityDef extends BaseCapability {
  inputSchema?: unknown;
  outputSchema?: unknown;
  reason?: string;
}

export const capabilityRegistry = {
  register: (cap: NVKCapabilityDef): void => {
    unifiedCapabilityRegistry.register(cap);
  },

  getCapability: (id: string) => {
    const entry = unifiedCapabilityRegistry.getCapability(id);
    return entry ? toRuntimeCapability(entry) : undefined;
  },

  getAll: () => unifiedCapabilityRegistry.getAll().map(toRuntimeCapability)
};
