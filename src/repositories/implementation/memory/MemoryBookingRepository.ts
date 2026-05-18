import type { Booking } from "../../../bookings/entities/Booking.ts";
import type { BookingRepository } from "../../BookingRepository.ts";

export class MemoryBookingRepository implements BookingRepository {
  private readonly bookings = new Map<string, Booking>();

  async hasOverlap(
    roomId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<boolean> {
    for (const b of this.bookings.values()) {
      if (b.roomId === roomId && b.startsAt < endsAt && startsAt < b.endsAt) {
        return true;
      }
    }
    return false;
  }

  async countFutureByUser(userId: string): Promise<number> {
    const now = new Date();
    let count = 0;
    for (const b of this.bookings.values()) {
      if (b.userId === userId && b.startsAt > now) {
        count++;
      }
    }
    return count;
  }

  async save(booking: Booking): Promise<void> {
    this.bookings.set(booking.id, booking);
  }
}
