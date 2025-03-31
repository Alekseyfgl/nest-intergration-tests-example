/**
 * Типы операций калькулятора
 */
export type Operation = 'add' | 'subtract' | 'multiply' | 'divide';

/**
 * Простая функция калькулятора, выполняющая базовые математические операции
 * @param a - Первое число
 * @param b - Второе число
 * @param operation - Операция: 'add', 'subtract', 'multiply', 'divide'
 * @returns - Результат операции
 * @throws {Error} - Если передана неподдерживаемая операция или деление на ноль
 */
export function calc(a: number, b: number, operation: Operation): number {
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
