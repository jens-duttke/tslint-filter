const utils = require('tsutils');

module.exports = require('../dist')('tslint/lib/rules/preferConditionalExpressionRule', {
	modifyFailure (failure) {
		const match = failure.getFailure().match(/'([^\0]+)'/);

		if (match !== null) {
			const node = utils.getTokenAtPosition(failure.sourceFile, failure.getStartPosition().getPosition()).parent;

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

				failure.failure = `${failure.failure} (save about ${originalSize - newLength} characters, conditional expression size would be about ${newLength} characters)`;
			}
		}

		return failure;
	}
});
