import { User } from './user.model';
import { settingTest, TestSetupResult } from '../test-utils/redis-test-setup';
import { INestApplication } from '@nestjs/common';

// Применяем префиксы на уровне тестов, а не на уровне Redis
describe('UsersService', () => {
  let testSetup: TestSetupResult;

  // Используем уникальный префикс для изоляции тестов пользователей
  const USER_PREFIX = 'user:';

  // Добавляем возможность мокать внутренний метод сервиса при необходимости
  const mockFindById = async (mockId: string): Promise<User | null> => {
    // Переопределяем findById для тестирования
    const originalFindById = testSetup.usersService!.findById;
    const spy = jest.spyOn(testSetup.usersService!, 'findById')
      .mockImplementation(async (id: string) => {
        return originalFindById.call(testSetup.usersService, id);
      });

    return testSetup.usersService!.findById(mockId);
  };

  beforeAll(async () => {
    // Используем функцию настройки тестов БЕЗ префикса и с общей базой данных
    testSetup = await settingTest({
      debug: true,
      redisDb: 0
    });
  });

  // Используем новый метод closeTest для очистки и закрытия
  afterAll(async () => {
    await testSetup.closeTest(USER_PREFIX);
  });

  // Используем новый метод cleanByPrefix для очистки между тестами
  afterEach(async () => {
    await testSetup.cleanByPrefix(USER_PREFIX);
  });

  describe('create', () => {
    it('должен создать нового пользователя с правильными данными', async () => {
      // Подготовка тестовых данных
      const userData = {
        username: 'testuser',
        email: 'test@example.com'
      };

      // Запуск тестируемого метода
      const result = await testSetup.usersService!.create(userData);

      // Проверка результатов
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.username).toBe(userData.username);
      expect(result.email).toBe(userData.email);
      expect(result.createdAt).toBeInstanceOf(Date);

      // Проверка, что пользователь сохранен в Redis
      const storedData = await testSetup.redisService.get(`${USER_PREFIX}${result.id}`);
      expect(storedData).toBeDefined();

      const storedUser = JSON.parse(storedData!) as User;
      expect(storedUser.id).toBe(result.id);
      expect(storedUser.username).toBe(userData.username);
      expect(storedUser.email).toBe(userData.email);
    });

    it('должен генерировать уникальный ID для каждого пользователя', async () => {
      // Создаем двух пользователей
      const user1 = await testSetup.usersService!.create({
        username: 'user1',
        email: 'user1@example.com'
      });

      const user2 = await testSetup.usersService!.create({
        username: 'user2',
        email: 'user2@example.com'
      });

      // ID должны быть разными
      expect(user1.id).not.toBe(user2.id);

      // Проверяем наличие обоих пользователей в Redis
      const stored1 = await testSetup.redisService.get(`${USER_PREFIX}${user1.id}`);
      const stored2 = await testSetup.redisService.get(`${USER_PREFIX}${user2.id}`);

      expect(stored1).toBeDefined();
      expect(stored2).toBeDefined();
    });

    it('должен создавать пользователя с правильной временной меткой', async () => {
      // Создаем пользователя
      const beforeCreate = new Date();

      const user = await testSetup.usersService!.create({
        username: 'testuser',
        email: 'test@example.com'
      });

      const afterCreate = new Date();

      // Проверяем, что createdAt находится в ожидаемом диапазоне
      expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(user.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());

      // Проверяем сохраненные данные
      const storedData = await testSetup.redisService.get(`${USER_PREFIX}${user.id}`);
      const storedUser = JSON.parse(storedData!) as User;

      // Временная метка должна быть сохранена как строка ISO
      const storedDate = new Date(storedUser.createdAt);
      expect(storedDate.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(storedDate.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });

    it('должен создавать пользователя с проверкой через findById', async () => {
      // Создаем пользователя
      const userData = {
        username: 'findtest',
        email: 'find@example.com'
      };

      const createdUser = await testSetup.usersService!.create(userData);

      // Пытаемся найти пользователя через findById
      const foundUser = await testSetup.usersService!.findById(createdUser.id);

      expect(foundUser).not.toBeNull();
      expect(foundUser!.id).toBe(createdUser.id);
      expect(foundUser!.username).toBe(userData.username);
      expect(foundUser!.email).toBe(userData.email);
      expect(foundUser!.createdAt).toBeInstanceOf(Date);
    });
  });
});
