import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '../redis/redis.module';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';

/**
 * Настраивает тестовое окружение для работы с Redis
 * @param options Дополнительные опции для настройки теста
 * @returns Объект с инстансами сервисов и модуля тестирования
 */
export interface RedisTestOptions {
  /** Хост Redis сервера */
  host?: string;
  /** Порт Redis сервера */
  port?: number;
  /** Включить ли отладочные сообщения */
  debug?: boolean;
  /** Максимальное количество попыток подключения */
  maxRetries?: number;
  /** Интервал между попытками подключения в миллисекундах */
  retryInterval?: number;
  /** Список дополнительных провайдеров для тестового модуля */
  providers?: any[];
  /** Префикс для ключей в Redis (для изоляции тестов) */
  keyPrefix?: string;
  /** Номер базы данных Redis (для изоляции тестов) */
  redisDb?: number;
}

/**
 * Результат настройки тестов с Redis
 */
export interface TestSetupResult {
  /** Модуль тестирования NestJS */
  moduleRef: TestingModule;
  /** Сервис для работы с Redis */
  redisService: RedisService;
  /** Сервис для работы с пользователями (опционально) */
  usersService?: UsersService;
  /** Очистить данные Redis по определенному шаблону ключей */
  cleanRedisData: (keyPattern: string) => Promise<void>;
  /** Очистить данные Redis по заданному префиксу */
  cleanByPrefix: (prefix: string) => Promise<void>;
  /** Закрыть тестовый модуль с очисткой данных с заданным префиксом */
  closeTest: (prefix?: string) => Promise<void>;
  /** Префикс ключей, используемый для изоляции тестов */
  keyPrefix: string;
}

/**
 * Настраивает тестовое окружение для работы с Redis
 * @param options Дополнительные опции для настройки теста
 * @returns Объект с инстансами сервисов и модуля тестирования
 */
export async function settingTest(options: RedisTestOptions = {}): Promise<TestSetupResult> {
  const {
    host = 'localhost',
    port = 6380,
    debug = false,
    maxRetries = 5,
    retryInterval = 1000,
    providers = [],
    keyPrefix = '',
    redisDb = 0,
  } = options;

  // Увеличиваем таймаут для тестов
  jest.setTimeout(30000);

  // Создаем тестовый модуль с настоящим Redis
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        // Устанавливаем переменные окружения для тестов
        load: [
          () => ({
            REDIS_HOST: host,
            REDIS_PORT: port,
            REDIS_DB: redisDb,
            REDIS_KEY_PREFIX: keyPrefix
          }),
        ],
      }),
      RedisModule,
    ],
    providers: [
      UsersService,
      ...providers,
    ],
  }).compile();

  const redisService = moduleRef.get<RedisService>(RedisService);
  let usersService: UsersService | undefined;
  
  try {
    usersService = moduleRef.get<UsersService>(UsersService);
  } catch {
    // Если UsersService не зарегистрирован, просто игнорируем
    if (debug) {
      console.log('UsersService не найден в модуле, продолжаем без него');
    }
  }
  
  // Явно инициализируем Redis-клиент
  await redisService.onModuleInit();
  
  // Проверяем подключение к Redis с повторными попытками
  let retries = 0;
  let connected = false;
  
  while (retries < maxRetries && !connected) {
    try {
      const testKey = `${keyPrefix}test`;
      await redisService.set(testKey, 'connection');
      const result = await redisService.get(testKey);
      if (result === 'connection') {
        connected = true;
        if (debug) {
          console.log(`Успешное подключение к Redis (DB: ${redisDb}, prefix: ${keyPrefix || 'none'})`);
        }
      } else {
        throw new Error('Ошибка проверки подключения к Redis');
      }
    } catch (error) {
      retries++;
      if (debug) {
        console.log(`Попытка подключения к Redis ${retries}/${maxRetries} не удалась`);
      }
      if (retries >= maxRetries) {
        console.error('Ошибка подключения к Redis:', error);
        throw new Error(`Не удалось подключиться к Redis на ${host}:${port} после ${maxRetries} попыток`);
      }
      // Ждем перед следующей попыткой
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
  }

  // Функция для очистки данных Redis
  const cleanRedisData = async (keyPattern: string): Promise<void> => {
    try {
      const client = redisService.getClient();
      if (client && typeof client.keys === 'function') {
        // Используем полный шаблон с префиксом (если он есть)
        const fullPattern = keyPrefix ? `${keyPrefix}${keyPattern}` : keyPattern;
        const keys = await client.keys(fullPattern);
        if (keys && keys.length > 0) {
          await client.del(keys);
          if (debug) {
            console.log(`Удалено ${keys.length} ключей по шаблону "${fullPattern}"`);
          }
        }
      }
    } catch (error) {
      console.warn(`Ошибка при очистке данных Redis по шаблону "${keyPattern}":`, error);
    }
  };

  // Новая функция для очистки данных по префиксу
  const cleanByPrefix = async (prefix: string): Promise<void> => {
    try {
      const client = redisService.getClient();
      const keys = await client.keys(`${prefix}*`);
      if (keys && keys.length > 0) {
        await client.del(keys);
        if (debug) {
          console.log(`Удалено ${keys.length} ключей с префиксом "${prefix}"`);
        }
      }
    } catch (error) {
      console.warn(`Ошибка при очистке данных Redis с префиксом "${prefix}":`, error);
    }
  };

  // Функция для закрытия модуля и очистки данных
  const closeTest = async (prefix?: string): Promise<void> => {
    try {
      // Если указан префикс, очищаем данные с этим префиксом
      if (prefix) {
        await cleanByPrefix(prefix);
      }
    } catch (error) {
      console.warn('Ошибка при очистке данных Redis:', error);
    } finally {
      // Закрываем модуль в любом случае
      if (moduleRef) {
        await moduleRef.close();
      }
    }
  };

  return {
    moduleRef,
    redisService,
    usersService,
    cleanRedisData,
    cleanByPrefix,
    closeTest,
    keyPrefix
  };
} 