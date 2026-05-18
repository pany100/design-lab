import type { BookingRepository } from "../../repositories/BookingRepository.ts";
import type { RoomRepository } from "../../repositories/RoomRepository.ts";
import { Booking } from "../entities/Booking.ts";
import {
  OverlapError,
  RoomNotFoundError,
  UserBookingLimitError,
} from "../errors.ts";
import type { BookingNotifier } from "../notifiers/BookingNotifier.ts";
import type { CreateBookingInput } from "../schema/createBookingInput.ts";

export class HandleCreateBookingUseCase {
  constructor(
    private readonly roomRepository: RoomRepository,
    private readonly bookingRepository: BookingRepository,
    private readonly bookingNotifier: BookingNotifier,
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

    this.bookingNotifier.notifyBookingCreated(booking).catch((err) => {
      console.error("Failed to notify booking created", {
        bookingId: booking.id,
        err,
      });
    });

    return booking;
  }
}
