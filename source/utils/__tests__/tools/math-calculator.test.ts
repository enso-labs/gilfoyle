import {mathCalculator} from '../../tools/math-calculator.js';

describe('mathCalculator', () => {
	it('should calculate simple addition', () => {
		const result = mathCalculator({expression: '2 + 2'});
		expect(result).toBe('2 + 2 = 4');
	});

	it('should calculate simple subtraction', () => {
		const result = mathCalculator({expression: '10 - 3'});
		expect(result).toBe('10 - 3 = 7');
	});

	it('should calculate multiplication', () => {
		const result = mathCalculator({expression: '5 * 6'});
		expect(result).toBe('5 * 6 = 30');
	});

	it('should calculate division', () => {
		const result = mathCalculator({expression: '15 / 3'});
		expect(result).toBe('15 / 3 = 5');
	});

	it('should handle parentheses', () => {
		const result = mathCalculator({expression: '(2 + 3) * 4'});
		expect(result).toBe('(2 + 3) * 4 = 20');
	});

	it('should handle decimal numbers', () => {
		const result = mathCalculator({expression: '3.14 * 2'});
		expect(result).toBe('3.14 * 2 = 6.28');
	});

	it('should handle complex expressions', () => {
		const result = mathCalculator({expression: '(10 + 5) / 3 - 2'});
		expect(result).toBe('(10 + 5) / 3 - 2 = 3');
	});

	it('should reject expressions with invalid characters', () => {
		const result = mathCalculator({expression: '2 + 2; alert("hack")'});
		expect(result).toContain('Invalid characters in expression');
		expect(result).toContain('Only numbers and basic operators');
	});

	it('should reject expressions with letters', () => {
		const result = mathCalculator({expression: '2 + a'});
		expect(result).toContain('Invalid characters in expression');
	});

	it('should handle invalid mathematical expressions', () => {
		const result = mathCalculator({expression: '2 +/ 2'});
		expect(result).toContain(
			'Error calculating "2 +/ 2": Invalid mathematical expression',
		);
	});

	it('should handle division by zero', () => {
		const result = mathCalculator({expression: '5 / 0'});
		expect(result).toBe('5 / 0 = Infinity');
	});

	it('should handle empty expression', () => {
		const result = mathCalculator({expression: ''});
		expect(result).toContain('Error calculating ""');
	});

	it('should handle expressions with only spaces', () => {
		const result = mathCalculator({expression: '   '});
		expect(result).toContain('Error calculating "   "');
	});

	it('should allow negative numbers', () => {
		const result = mathCalculator({expression: '-5 + 3'});
		expect(result).toBe('-5 + 3 = -2');
	});

	it('should handle nested parentheses', () => {
		const result = mathCalculator({expression: '((2 + 3) * (4 - 1))'});
		expect(result).toBe('((2 + 3) * (4 - 1)) = 15');
	});
});
