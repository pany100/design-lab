import { z } from "zod";

// Validación de SHAPE/tipos solamente. No mete reglas de negocio
// (endsAt > startsAt, rango futuro, etc.) — eso es decisión del use case.
//
// La salida ya viene "lista para usar": strings garantizados no vacíos
// y los timestamps parseados a Date.
export const createBookingInputSchema = z.object({
  userId: z.string().min(1),
  roomId: z.string().min(1),
  startsAt: z.iso.datetime().transform((s) => new Date(s)),
  endsAt: z.iso.datetime().transform((s) => new Date(s)),
});

export type CreateBookingInput = z.output<typeof createBookingInputSchema>;
