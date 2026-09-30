import { z } from "zod";

export const bookingSchema = z.object({
  id: z.number(),
  event_id: z.number(),
  user_id: z.number(),
  seatsBooked: z.number(),
  total_amount: z.number(),
  status: z.string(),
  createdAt: z.union([
    z.string().datetime({ offset: true }),
    z.date(),
    z.string(),
  ]),
  updatedAt: z.union([
    z.string().datetime({ offset: true }),
    z.date(),
    z.string(),
  ]),
});

export const createBookingSchema = bookingSchema.omit({
  id: true,
  user_id: true,
  total_amount: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export const updateBookingSchema = z.object({
  status: z.string()
});
