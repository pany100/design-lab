import type { EmailService } from "../../../external/services/EmailService.ts";
import type { Booking } from "../../entities/Booking.ts";
import type { BookingNotifier } from "../BookingNotifier.ts";

export class EmailBookingNotifier implements BookingNotifier {
  constructor(private readonly emailService: EmailService) {}

  async notifyBookingCreated(booking: Booking): Promise<void> {
    await this.emailService.send({
      to: booking.userId,
      subject: "Booking confirmation",
      body: `Booking ${booking.id} for room ${booking.roomId} from ${booking.startsAt.toISOString()} to ${booking.endsAt.toISOString()} confirmed.`,
    });
  }
}
