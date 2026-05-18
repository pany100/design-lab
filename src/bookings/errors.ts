export class InvalidBookingRangeError extends Error {
  constructor() {
    super("invalid_range");
    this.name = "InvalidBookingRangeError";
  }
}

export class PastBookingRangeError extends Error {
  constructor() {
    super("past_range");
    this.name = "PastBookingRangeError";
  }
}

export class RoomNotFoundError extends Error {
  constructor() {
    super("room_not_found");
    this.name = "RoomNotFoundError";
  }
}

export class OverlapError extends Error {
  constructor(public readonly conflictingBookingId: string) {
    super("overlap");
    this.name = "OverlapError";
  }
}

export class UserBookingLimitError extends Error {
  constructor() {
    super("user_booking_limit");
    this.name = "UserBookingLimitError";
  }
}

export type BookingDomainError =
  | InvalidBookingRangeError
  | PastBookingRangeError
  | RoomNotFoundError
  | OverlapError
  | UserBookingLimitError;
