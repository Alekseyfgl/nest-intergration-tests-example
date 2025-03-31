const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const path = require('path');
const { promisify } = require('util');
const fs = require('fs');

const fileExists = promisify(fs.access);

async function startRedis() {
  try {
    const projectRoot = path.resolve(__dirname, '..');
    const dockerComposePath = path.join(projectRoot, 'docker-compose.yml');
    
    // Проверяем, существует ли файл docker-compose.yml
    try {
      await fileExists(dockerComposePath);
    } catch (error) {
      console.log('docker-compose.yml not found, creating it...');
      // Создаем стандартный docker-compose.yml если он не существует
      const dockerComposeContent = `version: '3.8'

services:
  redis:
    image: redis:latest
    container_name: redis-test
    ports:
      - "6380:6379"
    command: redis-server
    networks:
      - app-network

networks:
  app-network:
    driver: bridge`;
      
      await promisify(fs.writeFile)(dockerComposePath, dockerComposeContent);
    }
    
    console.log('Checking if Docker is available...');
    await execPromise('docker --version');
    
    console.log('Checking if Docker Compose is available...');
    await execPromise('docker-compose --version');
    
    console.log('Stopping existing Redis containers if any...');
    try {
      // Останавливаем контейнеры, если они запущены
      await execPromise('docker-compose -f ' + dockerComposePath + ' down');
    } catch (e) {
      console.log('No containers were running or error stopping containers:', e.message);
    }
    
    console.log('Starting Redis with Docker Compose...');
    await execPromise('docker-compose -f ' + dockerComposePath + ' up -d');
    
    console.log('Waiting for Redis to be ready...');
    // Ждем 2 секунды, чтобы Redis успел запуститься
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Redis container started successfully on port 6380');
    return true;
  } catch (error) {
    console.log('Docker or Docker Compose is not available or permission denied:', error.message);
    console.log('Please ensure Redis is running on localhost:6380');
    return false;
  }
}

async function stopRedis(containerStarted) {
  if (containerStarted) {
    try {
      const projectRoot = path.resolve(__dirname, '..');
      const dockerComposePath = path.join(projectRoot, 'docker-compose.yml');
      
      console.log('Stopping Redis container...');
      await execPromise('docker-compose -f ' + dockerComposePath + ' down');
      console.log('Redis container stopped successfully');
    } catch (error) {
      console.error('Error stopping Redis container:', error.message);
    }
  }
}

module.exports = {
  startRedis,
  stopRedis
}; 