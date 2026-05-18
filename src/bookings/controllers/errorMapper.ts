import {
  InvalidBookingRangeError,
  OverlapError,
  PastBookingRangeError,
  RoomNotFoundError,
  UserBookingLimitError,
} from "../errors.ts";

export type HttpResponse = {
  status: number;
  body: Record<string, unknown>;
};

export function mapDomainErrorToHttp(err: unknown): HttpResponse | null {
  if (
    err instanceof InvalidBookingRangeError ||
    err instanceof PastBookingRangeError
  ) {
    return { status: 400, body: { error: err.message } };
  }

  if (err instanceof RoomNotFoundError) {
    return { status: 404, body: { error: err.message } };
  }

  if (err instanceof OverlapError) {
    return {
      status: 409,
      body: {
        error: err.message,
        conflictingBookingId: err.conflictingBookingId,
      },
    };
  }

  if (err instanceof UserBookingLimitError) {
    return { status: 409, body: { error: err.message } };
  }

  return null;
}
