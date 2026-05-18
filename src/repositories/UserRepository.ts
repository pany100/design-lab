export type User = {
  id: string;
};

export interface UserRepository {
  findById(id: string): Promise<User | null>;
}
