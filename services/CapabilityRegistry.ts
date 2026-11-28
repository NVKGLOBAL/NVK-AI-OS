/**
 * Services capability registry — thin adapter (matrix program, 2026-11-27).
 *
 * The registrations and the audited execution pipeline now live in the
 * canonical registry (src/nvk/capabilities/CanonicalCapabilityRegistry.ts),
 * which is the single source of truth shared with the runtime registry.
 * This module preserves the exact services API — register / get /
 * getAll / getAvailable / executeWithAudit — projecting each canonical
 * entry into the services shape (types.ts NVKCapability: available() as
 * an async function, execute() returning NVKCapabilityResult). Every
 * existing import site (TaskEngine, capability_evidence_test) keeps
 * working unchanged.
 */
import { unifiedCapabilityRegistry, toServicesCapability } from '../src/nvk/capabilities/CanonicalCapabilityRegistry';
import type { NVKCapability, NVKCapabilityResult, NVKExecutionContext } from '../types';

export const capabilityRegistry = {
  register: (capability: NVKCapability): void => {
    unifiedCapabilityRegistry.register(capability);
  },

  get: (id: string) => {
    const entry = unifiedCapabilityRegistry.get(id);
    return entry ? toServicesCapability(entry) : undefined;
  },

  getAll: () => unifiedCapabilityRegistry.getAll().map(toServicesCapability),

  getAvailable: async () => (await unifiedCapabilityRegistry.getAvailable()).map(toServicesCapability),

  executeWithAudit: (
    capabilityId: string,
    input: unknown,
    context: NVKExecutionContext = {}
  ): Promise<NVKCapabilityResult> => unifiedCapabilityRegistry.executeWithAudit(capabilityId, input, context)
};
