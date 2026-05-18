import type { EmailService } from "../../external/services/EmailService.ts";
import type { BookingRepository } from "../../repositories/BookingRepository.ts";
import type { RoomRepository } from "../../repositories/RoomRepository.ts";
import { Booking } from "../entities/Booking.ts";
import {
  OverlapError,
  RoomNotFoundError,
  UserBookingLimitError,
} from "../errors.ts";
import type { CreateBookingInput } from "../schema/createBookingInput.ts";

export class HandleCreateBookingUseCase {
  constructor(
    private readonly roomRepository: RoomRepository,
    private readonly bookingRepository: BookingRepository,
    private readonly emailService: EmailService,
  ) {}

  async execute(dto: CreateBookingInput): Promise<Booking> {
    const booking = Booking.create(
      {
        userId: dto.userId,
        roomId: dto.roomId,
        startsAt: dto.startsAt,
        endsAt: dto.endsAt,
      },
      new Date(),
    );

    const room = await this.roomRepository.findById(dto.roomId);
    if (!room) {
      throw new RoomNotFoundError();
    }

    const futureCount = await this.bookingRepository.countFutureByUser(
      booking.userId,
    );
    if (futureCount >= 3) {
      throw new UserBookingLimitError();
    }

    const overlap = await this.bookingRepository.findOverlapping(
      booking.roomId,
      booking.startsAt,
      booking.endsAt,
    );
    if (overlap) {
      throw new OverlapError(overlap.id);
    }

    await this.bookingRepository.save(booking);

    await this.emailService.send({
      to: booking.userId,
      subject: "Booking confirmation",
      body: `Booking ${booking.id} for room ${booking.roomId} from ${booking.startsAt.toISOString()} to ${booking.endsAt.toISOString()} confirmed.`,
    });

    return booking;
  }
}
