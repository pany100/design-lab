export type Room = {
  id: string;
};

export interface RoomRepository {
  findById(id: string): Promise<Room | null>;
}
