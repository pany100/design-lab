import { createBookingInputSchema, type CreateBookingInput } from "../schema/createBookingInput.ts";
import type { HandleCreateBookingUseCase } from "../use-cases/handleCreateBooking.use-case.ts";
import { bookingToDto } from "./bookingDtoMapper.ts";
import { mapDomainErrorToHttp } from "./errorMapper.ts";

export function createBookingController(useCase: HandleCreateBookingUseCase) {
  return async function handleCreateBooking(
    rawInput: unknown,
  ): Promise<{ status: number; body: unknown }> {
    const parsed = createBookingInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        status: 400,
        body: { error: "invalid_input", issues: parsed.error.issues },
      };
    }

    const input: CreateBookingInput = parsed.data;

    try {
      const booking = await useCase.execute(input);
      return { status: 201, body: bookingToDto(booking) };
    } catch (err) {
      const mapped = mapDomainErrorToHttp(err);
      if (mapped) {
        return mapped;
      }
      throw err;
    }
  };
}
