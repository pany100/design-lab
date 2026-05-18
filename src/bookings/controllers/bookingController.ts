import { createBookingInputSchema, type CreateBookingInput } from "../schema/createBookingInput.ts";
import { HandleCreateBookingUseCase } from "../use-cases/handleCreateBooking.use-case.ts";
import { MemoryRoomRepository } from "../../repositories/implementation/memory/MemoryRoomRepository.ts";
import { MemoryBookingRepository } from "../../repositories/implementation/memory/MemoryBookingRepository.ts";
import { ConsoleEmailService } from "../../external/services/ConsoleEmailService.ts";

const roomRepository = new MemoryRoomRepository();
const bookingRepository = new MemoryBookingRepository();
const emailService = new ConsoleEmailService();
const createBookingUseCase = new HandleCreateBookingUseCase(
  roomRepository,
  bookingRepository,
  emailService,
);

export async function handleCreateBooking(
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
    await createBookingUseCase.execute(input);
    return { status: 501, body: { error: "not_implemented_yet" } };
  } catch (err) {
    if (err instanceof Error) {
      switch (err.message) {
        case "invalid_range":
        case "past_range":
          return { status: 400, body: { error: err.message } };
        case "room_not_found":
          return { status: 404, body: { error: err.message } };
        case "overlap":
        case "user_booking_limit":
          return { status: 409, body: { error: err.message } };
      }
    }
    throw err;
  }
}
