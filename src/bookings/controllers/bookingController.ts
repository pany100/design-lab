import { createBookingInputSchema, type CreateBookingInput } from "../schema/createBookingInput.ts";
import { HandleCreateBookingUseCase } from "../use-cases/handleCreateBooking.use-case.ts";
import { MemoryRoomRepository } from "../../repositories/implementation/memory/MemoryRoomRepository.ts";
import { MemoryBookingRepository } from "../../repositories/implementation/memory/MemoryBookingRepository.ts";
import { ConsoleEmailService } from "../../external/services/ConsoleEmailService.ts";
import { bookingToDto } from "./bookingDtoMapper.ts";
import { mapDomainErrorToHttp } from "./errorMapper.ts";

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
    const booking = await createBookingUseCase.execute(input);
    return { status: 201, body: bookingToDto(booking) };
  } catch (err) {
    const mapped = mapDomainErrorToHttp(err);
    if (mapped) {
      return mapped;
    }
    throw err;
  }
}
