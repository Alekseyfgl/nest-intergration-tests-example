/**
 * Простая функция калькулятора, выполняющая базовые математические операции
 * @param {number} a - Первое число
 * @param {number} b - Второе число
 * @param {string} operation - Операция: 'add', 'subtract', 'multiply', 'divide'
 * @returns {number} - Результат операции
 * @throws {Error} - Если передана неподдерживаемая операция или деление на ноль
 */
function calc(a, b, operation) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('Оба аргумента должны быть числами');
  }

  switch (operation) {
    case 'add':
      return a + b;
    case 'subtract':
      return a - b;
    case 'multiply':
      return a * b;
    case 'divide':
      if (b === 0) {
        throw new Error('Деление на ноль невозможно');
      }
      return a / b;
    default:
      throw new Error(`Неподдерживаемая операция: ${operation}`);
  }
}

module.exports = calc; 