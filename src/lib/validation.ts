/**
 * Central Zod schemas — import these in API routes
 * Prevents raw unvalidated input from reaching DB
 */
import { z } from 'zod';

// ─── Common ────────────────────────────────────────────────────────────────
export const uuidSchema   = z.string().uuid();
export const dateSchema   = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');
export const emailSchema  = z.string().email().toLowerCase().trim();
export const phoneSchema  = z.string().regex(/^[0-9+\-\s()]{6,20}$/).optional();
export const moneySchema  = z.number().nonnegative().multipleOf(0.01);
export const slugSchema   = z.string().regex(/^[a-z0-9-]+$/).min(2).max(80);

// ─── Reservations ──────────────────────────────────────────────────────────
export const CreateReservationSchema = z.object({
  hotelId:         uuidSchema,
  roomTypeId:      uuidSchema,
  checkIn:         dateSchema,
  checkOut:        dateSchema,
  numAdults:       z.number().int().min(1).max(20),
  numChildren:     z.number().int().min(0).max(10).default(0),
  firstName:       z.string().trim().min(1).max(100),
  lastName:        z.string().trim().max(100).optional(),
  email:           emailSchema.optional(),
  phone:           phoneSchema,
  specialRequests: z.string().max(1000).optional(),
  source:          z.enum(['direct','booking_com','agoda','airbnb','expedia','walk_in','phone','other']).default('direct'),
  paymentMethod:   z.enum(['online','at_hotel','deposit']).default('online'),
  promoCode:       z.string().max(20).optional(),
  ratePlanId:      uuidSchema.optional(),
  roomTypeName:    z.string().max(100).optional(),
  totalAmount:     moneySchema.optional(),
}).refine(d => d.checkOut > d.checkIn, { message: 'checkOut must be after checkIn', path: ['checkOut'] });

// ─── Guests ────────────────────────────────────────────────────────────────
export const CreateGuestSchema = z.object({
  firstName:    z.string().trim().min(1).max(100),
  lastName:     z.string().trim().max(100).optional(),
  email:        emailSchema.optional(),
  phone:        phoneSchema,
  nationality:  z.string().length(2).optional(),
  passportNo:   z.string().max(20).optional(),
  dateOfBirth:  dateSchema.optional(),
});

// ─── Auth ──────────────────────────────────────────────────────────────────
export const RegisterSchema = z.object({
  email:     emailSchema,
  password:  z.string().min(8).max(100).regex(/[A-Z]/, 'Need uppercase').regex(/[0-9]/, 'Need number'),
  firstName: z.string().trim().min(1).max(100),
  lastName:  z.string().trim().max(100).optional(),
  phone:     phoneSchema,
});

export const LoginSchema = z.object({
  email:    emailSchema,
  password: z.string().min(1).max(100),
});

export const ForgotPasswordSchema = z.object({
  email: emailSchema,
});

// ─── Hotels ────────────────────────────────────────────────────────────────
export const UpdateHotelSchema = z.object({
  name:           z.string().trim().min(1).max(200).optional(),
  description:    z.string().max(5000).optional(),
  address:        z.string().max(500).optional(),
  city:           z.string().max(100).optional(),
  phone:          phoneSchema,
  email:          emailSchema.optional(),
  checkInTime:    z.string().regex(/^\d{2}:\d{2}$/).optional(),
  checkOutTime:   z.string().regex(/^\d{2}:\d{2}$/).optional(),
  vatRate:        z.number().min(0).max(0.5).optional(),
  serviceCharge:  z.number().min(0).max(0.5).optional(),
});

// ─── Rates ─────────────────────────────────────────────────────────────────
export const BulkRateSchema = z.object({
  hotelId:           uuidSchema,
  roomTypeId:        uuidSchema,
  dates:             z.array(dateSchema).min(1).max(366),
  rate:              moneySchema,
  minStay:           z.number().int().min(1).max(30).default(1),
  closedToArrival:   z.boolean().default(false),
  closedToDeparture: z.boolean().default(false),
});

// ─── Payments ──────────────────────────────────────────────────────────────
export const ChargeSchema = z.object({
  reservationId: uuidSchema,
  amount:        moneySchema,
  currency:      z.enum(['THB','USD','EUR','JPY','SGD']).default('THB'),
  token:         z.string().min(1),           // Omise card token
  description:   z.string().max(200).optional(),
});

// ─── Promo codes ──────────────────────────────────────────────────────────
export const PromoCodeSchema = z.object({
  hotelId:       uuidSchema,
  code:          z.string().min(3).max(20).toUpperCase(),
  description:   z.string().max(200).optional(),
  discountType:  z.enum(['percent','fixed','free_night']),
  discountValue: z.number().positive().max(100),
  minNights:     z.number().int().min(1).default(1),
  minAmount:     z.number().nonnegative().default(0),
  validFrom:     dateSchema.optional(),
  validUntil:    dateSchema.optional(),
  maxUses:       z.number().int().positive().optional(),
});

// ─── Rate limit helper ─────────────────────────────────────────────────────
export const RATE_LIMITS = {
  login:          { limit: 10,  windowMs: 60_000  },  // 10/min
  register:       { limit: 5,   windowMs: 60_000  },  // 5/min
  booking:        { limit: 30,  windowMs: 60_000  },  // 30/min
  payment:        { limit: 5,   windowMs: 60_000  },  // 5/min — extra strict
  aiChat:         { limit: 20,  windowMs: 60_000  },  // 20/min
  webhook:        { limit: 200, windowMs: 60_000  },  // 200/min — high volume
  passwordReset:  { limit: 3,   windowMs: 300_000 },  // 3/5min
  search:         { limit: 60,  windowMs: 60_000  },  // 60/min
  default:        { limit: 60,  windowMs: 60_000  },  // 60/min
} as const;

// ─── Helper: validate and return 400 on error ─────────────────────────────
import { NextResponse } from 'next/server';

export function validateBody<T>(schema: z.ZodSchema<T>, data: unknown): { data: T; error: null } | { data: null; error: NextResponse } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const messages = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { data: null, error: NextResponse.json({ error: 'Validation failed', details: messages }, { status: 400 }) };
  }
  return { data: result.data, error: null };
}
