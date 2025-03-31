const { startRedis, stopRedis } = require('./setup-redis');

let containerStarted = false;

beforeAll(async () => {
  // Запускаем Redis перед всеми тестами
  containerStarted = await startRedis();
  // Даем Redis время запуститься
  await new Promise(resolve => setTimeout(resolve, 2000));
}, 30000);

afterAll(async () => {
  // Останавливаем Redis после всех тестов
  await stopRedis(containerStarted);
}); 