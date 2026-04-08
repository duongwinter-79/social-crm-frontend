import type { CapabilityRegistry } from "./types";

export const capabilityRegistry: CapabilityRegistry = {
  dashboard: { enabled: true },
  leads: { enabled: true },
  leadProfiles: { enabled: true },
  aiExtraction: { enabled: true },
  matching: { enabled: true },
  orders: { enabled: true },
  applications: {
    enabled: false,
    reason: "Backend controller exists but does not expose usable CRUD endpoints yet."
  },
  documents: {
    enabled: false,
    reason: "Backend controller exists but does not expose usable CRUD endpoints yet."
  },
  trainingFinance: {
    enabled: false,
    reason: "Backend controller exists but does not expose usable CRUD endpoints yet."
  },
  integrations: { enabled: true },
  candidatePortal: {
    enabled: false,
    reason: "External candidate auth and resource APIs are not complete yet."
  }
};
