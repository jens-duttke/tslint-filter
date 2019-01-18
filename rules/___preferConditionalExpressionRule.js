const Utils = require('tsutils');

module.exports = require('../dist')('tslint/lib/rules/preferConditionalExpressionRule', {
	modifyFailure (failure) {
		const match = failure.getFailure().match(/'([^\0]+)'/);

		if (match !== null) {
			const node = Utils.getTokenAtPosition(failure.sourceFile, failure.getStartPosition().getPosition());
			const parent = node.parent;

			const originalSize = (parent.end - parent.pos);

			const assigneeLength = match[1].length;
			const expressionLength = parent.expression.end - parent.expression.pos;
			const thenStatementLength = parent.thenStatement.getText().replace(/^{?[\s\n]+|[\s\n]+}?$/g, '').length;
			const elseStatementLength = parent.elseStatement.getText().replace(/^{?[\s\n]+|[\s\n]+}?$/g, '').length;

			// That's only an approximated size, depending on the wrapping characters
			newLength = expressionLength + thenStatementLength + elseStatementLength - assigneeLength + 1;

			if (newLength > originalSize) {
				return;
			}

			failure.failure = `${failure.failure} (save about ${originalSize - newLength} characters, conditional expression size would be about ${newLength} characters)`
		}

		return failure;
	}
});
