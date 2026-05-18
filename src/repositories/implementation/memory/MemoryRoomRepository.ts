import type { Room, RoomRepository } from "../../RoomRepository.ts";

export class MemoryRoomRepository implements RoomRepository {
  private readonly rooms = new Map<string, Room>();

  async findById(id: string): Promise<Room | null> {
    return this.rooms.get(id) ?? null;
  }
}
