import type { CapabilityRegistry } from "./types";

export const capabilityRegistry: CapabilityRegistry = {
  dashboard: { enabled: true },
  leads: { enabled: true },
  leadProfiles: { enabled: true },
  aiExtraction: { enabled: true },
  matching: { enabled: true },
  orders: { enabled: true },
  applications: { enabled: true },
  documents: { enabled: true },
  trainingFinance: { enabled: true },
  integrations: { enabled: true },
  candidatePortal: {
    enabled: false,
    reason: "External candidate auth and resource APIs are not complete yet."
  }
};
