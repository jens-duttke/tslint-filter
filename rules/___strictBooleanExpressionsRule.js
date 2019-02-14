const ts = require('typescript');
const utils = require('tsutils');

module.exports = require('../dist')('tslint/lib/rules/strictBooleanExpressionsRule', {
	/**
	 * @param {import('tslint').RuleFailure} [failure]
	 * @param {ts.SourceFile} [sourceFile]
	 */
	modifyFailure (failure, sourceFile) {
		let node = utils.getTokenAtPosition(sourceFile, failure.getStartPosition().getPosition()).parent;

		// Find nearest parent which is not an expression to determine the context
		while (utils.isExpression(node) && !utils.isJsxExpression(node) && (node = node.parent) !== undefined) {}

		// Return failure.getFailure().replace(/ operator because /, ` operator in ${ts.SyntaxKind[node.kind]} because `);
		return failure.getFailure().replace(/ operator because /, ` operator in ${ts.SyntaxKind[node.kind]} because `);
	}
});
