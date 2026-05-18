import { randomUUID } from "node:crypto";

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
      throw new Error("invalid_range");
    }
    if (props.startsAt < now) {
      throw new Error("past_range");
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
