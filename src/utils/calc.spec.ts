import { calc, Operation } from './calc';

describe('Калькулятор (TypeScript)', () => {
  describe('Основные операции', () => {
    // Таблица тестовых случаев для операций
    interface TestCase {
      a: number;
      b: number;
      operation: Operation;
      expected: number;
      description: string;
      precision?: number;
    }

    const testCases: TestCase[] = [
      // Сложение
      { a: 10, b: 5, operation: 'add', expected: 15, description: 'сложение положительных чисел' },
      { a: -10, b: -5, operation: 'add', expected: -15, description: 'сложение отрицательных чисел' },
      { a: 10, b: -5, operation: 'add', expected: 5, description: 'сложение положительного и отрицательного' },
      { a: 0, b: 5, operation: 'add', expected: 5, description: 'сложение с нулем (0 + x)' },
      { a: 0.1, b: 0.2, operation: 'add', expected: 0.3, description: 'сложение дробных чисел', precision: 5 },

      // Вычитание
      { a: 10, b: 5, operation: 'subtract', expected: 5, description: 'вычитание меньшего из большего' },
      { a: 5, b: 10, operation: 'subtract', expected: -5, description: 'вычитание большего из меньшего' },
      { a: -5, b: -10, operation: 'subtract', expected: 5, description: 'вычитание отрицательных чисел' },
      { a: 0, b: 5, operation: 'subtract', expected: -5, description: 'вычитание из нуля' },

      // Умножение
      { a: 10, b: 5, operation: 'multiply', expected: 50, description: 'умножение положительных чисел' },
      { a: -10, b: 5, operation: 'multiply', expected: -50, description: 'умножение отрицательного на положительное' },
      { a: -10, b: -5, operation: 'multiply', expected: 50, description: 'умножение отрицательных чисел' },
      { a: 10, b: 0, operation: 'multiply', expected: 0, description: 'умножение на ноль' },
      { a: 0.5, b: 0.2, operation: 'multiply', expected: 0.1, description: 'умножение дробных чисел', precision: 5 },

      // Деление
      { a: 10, b: 5, operation: 'divide', expected: 2, description: 'деление без остатка' },
      { a: 10, b: 3, operation: 'divide', expected: 3.3333, description: 'деление с остатком', precision: 3 },
      { a: -10, b: 5, operation: 'divide', expected: -2, description: 'деление отрицательного на положительное' },
      { a: -10, b: -5, operation: 'divide', expected: 2, description: 'деление отрицательных чисел' },
      { a: 0, b: 5, operation: 'divide', expected: 0, description: 'деление нуля' }
    ];

    // Выполняем тесты для каждого тестового случая
    testCases.forEach(({ a, b, operation, expected, description, precision }) => {
      it(`должен правильно выполнять ${description}`, () => {
        const result = calc(a, b, operation);
        
        if (precision !== undefined) {
          expect(result).toBeCloseTo(expected, precision);
        } else {
          expect(result).toBe(expected);
        }
      });
    });
  });

  describe('Проверка ошибок', () => {
    it('должен выбрасывать ошибку при делении на ноль', () => {
      expect(() => calc(10, 0, 'divide')).toThrow('Деление на ноль невозможно');
    });

    it('должен выбрасывать типизированную ошибку для неподдерживаемой операции', () => {
      // Используем type assertion для тестирования ошибки с неверным типом
      expect(() => calc(10, 5, 'power' as Operation)).toThrow(/Неподдерживаемая операция/);
    });
  });

  describe('Граничные случаи', () => {
    it('должен правильно работать с очень большими числами', () => {
      const maxSafeInt = Number.MAX_SAFE_INTEGER;
      expect(calc(maxSafeInt, 1, 'add')).toBe(maxSafeInt + 1);
    });

    it('должен правильно работать с очень маленькими числами', () => {
      const epsilon = Number.EPSILON;
      expect(calc(1, epsilon, 'add')).toBeCloseTo(1 + epsilon);
    });
    
    it('должен правильно работать с отрицательным нулем', () => {
      expect(calc(0, -0, 'add')).toBe(0);
      expect(Object.is(calc(0, -0, 'add'), 0)).toBeTruthy();
    });
    
    it('должен правильно работать с Infinity', () => {
      expect(calc(Infinity, 5, 'add')).toBe(Infinity);
      expect(calc(Infinity, Infinity, 'add')).toBe(Infinity);
      expect(calc(Infinity, -Infinity, 'add')).toBe(NaN);
    });
  });

  describe('Производительность', () => {
    it('должен быстро выполнять операции (бенчмарк)', () => {
      const startTime = performance.now();
      
      // Выполняем много операций для оценки производительности
      for (let i = 0; i < 100000; i++) {
        calc(i, i + 1, 'add');
        calc(i, i + 1, 'multiply');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`Время выполнения 200000 операций: ${duration}мс`);
      
      // Проверяем, что операции выполняются быстрее некоторого порога
      // Пороговое значение может варьироваться в зависимости от системы
      expect(duration).toBeLessThan(1000); // Ожидаем менее 1 секунды
    });
  });
}); 