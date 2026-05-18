import type { Booking } from "../bookings/entities/Booking.ts";

export interface BookingRepository {
  hasOverlap(roomId: string, startsAt: Date, endsAt: Date): Promise<boolean>;
  countFutureByUser(userId: string): Promise<number>;
  save(booking: Booking): Promise<void>;
}
