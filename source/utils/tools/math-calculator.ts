/**
 * Calculate the result of a mathematical expression
 * @param expression - The expression to calculate
 * @returns The result of the expression
 */
export function mathCalculator({expression}: {expression: string}) {
	try {
		// Basic math evaluation (be careful with eval in production!)
		// This is a simplified version - in production you'd want a proper math parser
		const sanitizedExpression = expression.replace(/[^0-9+\-*/().\s]/g, '');
		if (sanitizedExpression !== expression) {
			return `Invalid characters in expression. Only numbers and basic operators (+, -, *, /, parentheses) are allowed.`;
		}

		const result = Function(
			`"use strict"; return (${sanitizedExpression})`,
		)();
		return `${expression} = ${result}`;
	} catch (error) {
		return `Error calculating "${expression}": Invalid mathematical expression.`;
	}
} 