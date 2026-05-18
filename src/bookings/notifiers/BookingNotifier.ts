import type { Booking } from "../entities/Booking.ts";

export interface BookingNotifier {
  notifyBookingCreated(booking: Booking): Promise<void>;
}
