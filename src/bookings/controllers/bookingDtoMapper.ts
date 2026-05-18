import type { Booking } from "../entities/Booking.ts";

export type BookingDto = {
  id: string;
  userId: string;
  roomId: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
};

export function bookingToDto(booking: Booking): BookingDto {
  return {
    id: booking.id,
    userId: booking.userId,
    roomId: booking.roomId,
    startsAt: booking.startsAt.toISOString(),
    endsAt: booking.endsAt.toISOString(),
    createdAt: booking.createdAt.toISOString(),
  };
}
