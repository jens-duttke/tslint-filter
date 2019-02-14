const utils = require('tsutils');

module.exports = require('../dist')('tslint/lib/rules/preferConditionalExpressionRule', {
	/**
	 * @param {import('tslint').RuleFailure} [failure]
	 * @param {import('typescript').SourceFile} [sourceFile]
	 */
	modifyFailure (failure, sourceFile) {
		const match = failure.getFailure().match(/'([^\0]+)'/);

		if (match !== null) {
			const node = utils.getTokenAtPosition(sourceFile, failure.getStartPosition().getPosition()).parent;

			if (utils.isIfStatement(node)) {
				const originalSize = (node.end - node.pos);

				const assigneeLength = match[1].length;
				const expressionLength = node.expression.end - node.expression.pos;
				const thenStatementLength = node.thenStatement.getText().replace(/^{?[\s\n]+|[\s\n]+}?$/g, '').length;
				const elseStatementLength = node.elseStatement.getText().replace(/^{?[\s\n]+|[\s\n]+}?$/g, '').length;

				// That's only an approximated size, depending on the wrapping characters
				const newLength = expressionLength + thenStatementLength + elseStatementLength - assigneeLength + 1;

				if (newLength > originalSize) {
					// If no value is returned, the linter error get suppressed
					return;
				}

				return `${failure.getFailure()} (save about ${originalSize - newLength} characters, conditional expression size would be about ${newLength} characters)`;
			}
		}

		return failure;
	}
});
