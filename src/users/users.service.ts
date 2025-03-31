import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { User } from './user.model';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsersService {
  private readonly userPrefix = 'user:';

  constructor(private readonly redisService: RedisService) {}

  async create(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const id = uuidv4();
    const createdAt = new Date();

    const user: User = {
      id,
      ...userData,
      createdAt,
    };

    await this.redisService.set(
      `${this.userPrefix}${id}`,
      JSON.stringify(user),
    );
    const u = await this.redisService.get(`${this.userPrefix}${id}`);
    console.log('u', u);
    return user;
  }

  async findById(id: string): Promise<User | null> {
    const userData = await this.redisService.get(`${this.userPrefix}${id}`);

    if (!userData) {
      return null;
    }

    const user = JSON.parse(userData) as User;
    // Преобразуем строку обратно в объект Date
    user.createdAt = new Date(user.createdAt);

    return user;
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.redisService.del(`${this.userPrefix}${id}`);
    return result > 0;
  }
}
