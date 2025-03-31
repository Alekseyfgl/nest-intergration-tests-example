import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '../src/redis/redis.module';
import { UsersModule } from '../src/users/users.module';
import { UsersService } from '../src/users/users.service';
import { RedisService } from '../src/redis/redis.service';

/**
 * Этот тест предполагает, что Redis запущен на localhost:6380.
 * Перед запуском тестов вы можете запустить его с помощью Docker Compose:
 * docker-compose up -d
 */
describe('UsersService Integration Tests', () => {
  let moduleRef: TestingModule;
  let usersService: UsersService;
  let redisService: RedisService;

  beforeAll(async () => {
    jest.setTimeout(30000); // Увеличиваем таймаут для тестов

    // Создание тестового модуля
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          // Устанавливаем переменные окружения для тестов
          load: [
            () => ({
              REDIS_HOST: 'localhost',
              REDIS_PORT: 6380, // Используем нестандартный порт
            }),
          ],
        }),
        RedisModule,
        UsersModule,
      ],
    }).compile();

    redisService = moduleRef.get<RedisService>(RedisService);
    usersService = moduleRef.get<UsersService>(UsersService);

    // Ожидаем инициализации Redis клиента
    try {
      const client = redisService.getClient();

      // Если клиент не подключен, пробуем подключиться
      if (!client?.isReady) {
        await redisService.onModuleInit();

        // Проверяем подключение
        await redisService.set('test', 'test');
        const result = await redisService.get('test');
        if (result !== 'test') {
          throw new Error('Redis connection test failed');
        }
      }
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw new Error('Redis connection failed. Make sure Redis is running on localhost:6380');
    }
  });

  afterAll(async () => {
    // Закрываем модуль NestJS
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('should create a user and store it in Redis', async () => {
    // Создаем пользователя
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
    };

    const user = await usersService.create(userData);

    // Проверяем, что пользователь был создан с правильными данными
    expect(user).toBeDefined();
    expect(user.id).toBeDefined();
    expect(user.username).toBe(userData.username);
    expect(user.email).toBe(userData.email);
    expect(user.createdAt).toBeInstanceOf(Date);

    // Пытаемся получить пользователя из Redis
    const retrievedUser = await usersService.findById(user.id);

    // Проверяем, что пользователь был получен и данные совпадают
    expect(retrievedUser).not.toBeNull();
    if (retrievedUser) {
      expect(retrievedUser.id).toBe(user.id);
      expect(retrievedUser.username).toBe(userData.username);
      expect(retrievedUser.email).toBe(userData.email);
      expect(retrievedUser.createdAt).toBeInstanceOf(Date);
    }
  });

  it('should return null for non-existent user', async () => {
    const nonExistentUser = await usersService.findById('non-existent-id');
    expect(nonExistentUser).toBeNull();
  });

  it('should delete a user from Redis', async () => {
    // Создаем пользователя
    const userData = {
      username: 'userToDelete',
      email: 'delete@example.com',
    };

    const user = await usersService.create(userData);

    // Проверяем, что пользователь существует
    let retrievedUser = await usersService.findById(user.id);
    expect(retrievedUser).not.toBeNull();

    // Удаляем пользователя
    const deleted = await usersService.deleteById(user.id);
    expect(deleted).toBe(true);

    // Проверяем, что пользователь удален
    retrievedUser = await usersService.findById(user.id);
    expect(retrievedUser).toBeNull();
  });
});
