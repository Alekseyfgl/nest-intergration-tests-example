#!/bin/bash

# Проверка, установлен ли Docker
if ! [ -x "$(command -v docker)" ]; then
  echo 'Предупреждение: Docker не установлен. Продолжаем без запуска контейнера Redis.' >&2
  echo 'Убедитесь, что Redis запущен на localhost:6379' >&2
  npm run test:integration
  exit $?
fi

# Проверка прав доступа к Docker
if ! docker info >/dev/null 2>&1; then
  echo 'Предупреждение: Нет прав доступа к Docker. Продолжаем без запуска контейнера Redis.' >&2
  echo 'Убедитесь, что Redis запущен на localhost:6379, или запустите скрипт с sudo' >&2
  npm run test:integration
  exit $?
fi

# Остановка и удаление контейнера Redis, если он уже запущен
docker stop redis-test 2>/dev/null || true
docker rm redis-test 2>/dev/null || true

# Запуск Redis в Docker
echo "Запуск Redis в Docker..."
docker run -d -p 6379:6379 --name redis-test redis:latest

# Ожидание, пока Redis запустится
echo "Ждем, пока Redis запустится..."
sleep 2

# Запуск тестов
echo "Запуск интеграционных тестов..."
npm run test:integration

# Сохранение статуса выполнения тестов
TEST_EXIT_CODE=$?

# Остановка и удаление контейнера Redis
echo "Завершение и очистка..."
docker stop redis-test
docker rm redis-test

# Выход с тем же статусом, что и тесты
exit $TEST_EXIT_CODE 