/**
 * Unit Tests: Feature Gate
 * Tests plan-based feature access control
 *
 * Note: These are integration tests that need Supabase
 * For pure unit tests, mock createAdminClient
 */

// Mock supabase
jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => {
            if (table === 'organizations') {
              return { data: mockOrg, error: null };
            }
            return { data: null, error: null };
          },
        }),
        in: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }),
      }),
    }),
  }),
}));

let mockOrg = { subscription_plan: 'starter', subscription_status: 'active', trial_ends_at: null };

import { checkFeatureGate } from '@/lib/billing/feature-gate';

describe('Feature Gate', () => {

  it('starter plan can access core_pms', async () => {
    mockOrg = { ...mockOrg, subscription_plan: 'starter' };
    const result = await checkFeatureGate('org-1', 'core_pms');
    expect(result.allowed).toBe(true);
  });

  it('starter plan cannot access ai_inbox', async () => {
    mockOrg = { ...mockOrg, subscription_plan: 'starter' };
    const result = await checkFeatureGate('org-1', 'ai_inbox');
    expect(result.allowed).toBe(false);
    expect(result.upgrade).toBeDefined();
  });

  it('standard plan can access ai_inbox', async () => {
    mockOrg = { ...mockOrg, subscription_plan: 'standard' };
    const result = await checkFeatureGate('org-1', 'ai_inbox');
    expect(result.allowed).toBe(true);
  });

  it('standard plan cannot access dynamic_pricing', async () => {
    mockOrg = { ...mockOrg, subscription_plan: 'standard' };
    const result = await checkFeatureGate('org-1', 'dynamic_pricing');
    expect(result.allowed).toBe(false);
  });

  it('pro plan can access dynamic_pricing', async () => {
    mockOrg = { ...mockOrg, subscription_plan: 'pro' };
    const result = await checkFeatureGate('org-1', 'dynamic_pricing');
    expect(result.allowed).toBe(true);
  });

  it('pro plan cannot access white_label', async () => {
    mockOrg = { ...mockOrg, subscription_plan: 'pro' };
    const result = await checkFeatureGate('org-1', 'white_label');
    expect(result.allowed).toBe(false);
    expect(result.requiredPlan).toBe('enterprise');
  });

  it('expired subscription blocks features above starter', async () => {
    mockOrg = { ...mockOrg, subscription_plan: 'pro', subscription_status: 'past_due', trial_ends_at: null };
    const result = await checkFeatureGate('org-1', 'dynamic_pricing');
    expect(result.allowed).toBe(false);
  });
});
