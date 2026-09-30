import { z } from "zod";

export const eventSchema = z.object({
    id: z.number(),
    organizer_id: z.number(),
    title: z.string().min(1, "title should be longer").max(255),
    description: z.string().nullable().optional(),
    venue: z.string().min(1).max(200),
    event_date: z.string().datetime({ offset: true }),
    ticket_price: z.number().nonnegative(),
    total_seats: z.number().int().positive(),
    available_seats: z.number().nullable().optional(),
    createdAt: z.union([z.string().datetime({ offset: true }), z.date(), z.string()]),
    updatedAt: z.union([z.string().datetime({ offset: true }), z.date(), z.string()]),
})

export const createEventSchema = eventSchema.omit({
    id: true,
    organizer_id: true,
    createdAt: true,
    updatedAt: true
})

export const updateEventSchema = z.object({
    title: z.string().min(1, "title should be longer").max(255).optional(),
    description: z.string().nullable().optional(),
    venue: z.string().min(1).max(200).optional(),
    event_date: z.string().datetime({ offset: true }).optional(),
    ticket_price: z.number().nonnegative().optional(),
    total_seats: z.number().int().positive().optional(),
    available_seats: z.number().nullable().optional(),
})