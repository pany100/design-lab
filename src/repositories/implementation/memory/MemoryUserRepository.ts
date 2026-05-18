import type { User, UserRepository } from "../../UserRepository.ts";

export class MemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }
}
