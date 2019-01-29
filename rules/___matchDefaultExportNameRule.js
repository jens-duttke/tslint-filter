const utils = require('tsutils');

module.exports = require('../dist')('tslint/lib/rules/matchDefaultExportNameRule', {
	modifyFailure (failure) {
		const node = utils.getTokenAtPosition(failure.sourceFile, failure.getStartPosition().getPosition()).parent.parent;

		if (utils.isImportDeclaration(node) && utils.isLiteralExpression(node.importClause.parent.moduleSpecifier)) {
			const moduleSpecifier = node.importClause.parent.moduleSpecifier.text;

			failure.failure = failure.failure.replace(
				/^Expected import '(.+?)' to match the default export '(.+?)'.$/,
				(_match, p1, p2) => `Expected import '${p1}' of module '${moduleSpecifier}' to match the default export '${p2}'.`
			);
		}

		return failure;
	}
});
