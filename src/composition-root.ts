import { createBookingController } from "./bookings/controllers/bookingController.ts";
import { HandleCreateBookingUseCase } from "./bookings/use-cases/handleCreateBooking.use-case.ts";
import { ConsoleEmailService } from "./external/services/ConsoleEmailService.ts";
import { MemoryBookingRepository } from "./repositories/implementation/memory/MemoryBookingRepository.ts";
import { MemoryRoomRepository } from "./repositories/implementation/memory/MemoryRoomRepository.ts";

const roomRepository = new MemoryRoomRepository();
const bookingRepository = new MemoryBookingRepository();
const emailService = new ConsoleEmailService();

const createBookingUseCase = new HandleCreateBookingUseCase(
  roomRepository,
  bookingRepository,
  emailService,
);

export const handleCreateBooking = createBookingController(createBookingUseCase);
