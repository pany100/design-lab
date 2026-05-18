import { randomUUID } from "node:crypto";
import {
  InvalidBookingRangeError,
  PastBookingRangeError,
} from "../errors.ts";

export type BookingProps = {
  userId: string;
  roomId: string;
  startsAt: Date;
  endsAt: Date;
};

export class Booking {
  private constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly roomId: string,
    public readonly startsAt: Date,
    public readonly endsAt: Date,
    public readonly createdAt: Date,
  ) {}

  static create(props: BookingProps, now: Date): Booking {
    if (props.endsAt <= props.startsAt) {
      throw new InvalidBookingRangeError();
    }
    if (props.startsAt < now) {
      throw new PastBookingRangeError();
    }
    return new Booking(
      randomUUID(),
      props.userId,
      props.roomId,
      props.startsAt,
      props.endsAt,
      now,
    );
  }
}
