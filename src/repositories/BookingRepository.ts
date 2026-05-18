import type { Booking } from "../bookings/entities/Booking.ts";

export interface BookingRepository {
  findOverlapping(
    roomId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<Booking | null>;
  countFutureByUser(userId: string): Promise<number>;
  save(booking: Booking): Promise<void>;
}
