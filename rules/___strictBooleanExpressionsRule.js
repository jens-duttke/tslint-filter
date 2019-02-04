const ts = require('typescript');
const utils = require('tsutils');

module.exports = require('../dist')('tslint/lib/rules/strictBooleanExpressionsRule', {
	modifyFailure (failure) {
		let node = utils.getTokenAtPosition(failure.sourceFile, failure.getStartPosition().getPosition()).parent;

		// Find nearest parent which is not an expression to determine the context
		while (utils.isExpression(node) && !utils.isJsxExpression(node) && (node = node.parent) !== undefined) {}

		failure.failure = failure.failure.replace(/ operator because /, ` operator in ${ts.SyntaxKind[node.kind]} because `);

		return failure;
	}
});
