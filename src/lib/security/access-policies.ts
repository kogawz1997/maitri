export const ACCESS_POLICIES = {
  sessionTimeoutMinutes: {
    owner: 30,
    admin: 45,
    manager: 60,
    staff: 120,
  },
  require2FA: ['owner', 'admin'],
  breakGlassRole: 'owner',
  jitAccessMaxHours: 24,
} as const;
