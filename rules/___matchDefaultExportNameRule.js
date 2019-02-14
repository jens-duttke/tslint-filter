const utils = require('tsutils');

module.exports = require('../dist')('tslint/lib/rules/matchDefaultExportNameRule', {
	/**
	 * @param {import('tslint').RuleFailure} [failure]
	 * @param {import('typescript').SourceFile} [sourceFile]
	 */
	modifyFailure (failure, sourceFile) {
		const node = utils.getTokenAtPosition(sourceFile, failure.getStartPosition().getPosition()).parent.parent;

		if (utils.isImportDeclaration(node) && utils.isLiteralExpression(node.importClause.parent.moduleSpecifier)) {
			const moduleSpecifier = node.importClause.parent.moduleSpecifier.text;

			return failure.getFailure().replace(
				/^Expected import '(.+?)' to match the default export '(.+?)'.$/,
				(_match, p1, p2) => `Expected import '${p1}' of module '${moduleSpecifier}' to match the default export '${p2}'.`
			);
		}

		return failure;
	}
});
