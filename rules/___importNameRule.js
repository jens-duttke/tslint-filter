const utils = require('tsutils');

module.exports = require('../dist')('tslint-microsoft-contrib/importNameRule', {
	/**
	 * @param {import('tslint').RuleFailure} [failure]
	 * @param {import('typescript').SourceFile} [sourceFile]
	 */
	modifyFailure (failure, sourceFile) {
		if (/^Misnamed import\./.test(failure.getFailure())) {
			const node = utils.getTokenAtPosition(sourceFile, failure.getStartPosition().getPosition());

			if (utils.isImportDeclaration(node.parent) && utils.isLiteralExpression(node.parent.moduleSpecifier)) {
				return `${failure.getFailure()} for '${node.parent.moduleSpecifier.text}'`;
			}
		}

		return failure;
	}
});
