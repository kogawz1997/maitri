export type PluginManifest = {
  id: string;
  name: string;
  version: string;
  category: 'marketing' | 'operations' | 'accounting' | 'connectivity';
  description: string;
  enabled: boolean;
};

export const MARKETPLACE_PLUGINS: PluginManifest[] = [
  {
    id: 'line-marketing-sync',
    name: 'LINE Marketing Sync',
    version: '1.0.0',
    category: 'marketing',
    description: 'Sync segments and campaign triggers from Maitri guests to LINE audience pools.',
    enabled: true,
  },
  {
    id: 'accounting-export-pro',
    name: 'Accounting Export Pro',
    version: '1.0.0',
    category: 'accounting',
    description: 'Export folio and tax transactions into standardized accounting bundles.',
    enabled: true,
  },
  {
    id: 'ops-alert-bridge',
    name: 'Ops Alert Bridge',
    version: '1.0.0',
    category: 'operations',
    description: 'Bridge critical ops alerts to external incident systems.',
    enabled: false,
  },
];
