export const RBAC_MATRIX = [
  { menu: '/dashboard', owner: 'full', admin: 'full', manager: 'full', front_desk: 'limited', housekeeping: 'none', maintenance: 'none', concierge: 'none', security: 'none', accounting: 'none', staff: 'read' },
  { menu: '/dashboard/reservations', owner: 'full', admin: 'full', manager: 'full', front_desk: 'full', housekeeping: 'none', maintenance: 'none', concierge: 'read', security: 'none', accounting: 'read', staff: 'read' },
  { menu: '/dashboard/housekeeping', owner: 'full', admin: 'full', manager: 'full', front_desk: 'read', housekeeping: 'full', maintenance: 'read', concierge: 'none', security: 'none', accounting: 'none', staff: 'none' },
  { menu: '/dashboard/maintenance', owner: 'full', admin: 'full', manager: 'full', front_desk: 'read', housekeeping: 'read', maintenance: 'full', concierge: 'none', security: 'read', accounting: 'none', staff: 'none' },
  { menu: '/dashboard/accounting', owner: 'full', admin: 'full', manager: 'read', front_desk: 'none', housekeeping: 'none', maintenance: 'none', concierge: 'none', security: 'none', accounting: 'full', staff: 'none' },
  { menu: '/dashboard/concierge', owner: 'full', admin: 'full', manager: 'full', front_desk: 'read', housekeeping: 'none', maintenance: 'none', concierge: 'full', security: 'none', accounting: 'none', staff: 'none' },
  { menu: '/dashboard/security', owner: 'full', admin: 'full', manager: 'read', front_desk: 'none', housekeeping: 'none', maintenance: 'read', concierge: 'none', security: 'full', accounting: 'none', staff: 'none' },
];
