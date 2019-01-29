const utils = require('tsutils');

module.exports = require('../dist')('tslint-microsoft-contrib/importNameRule', {
	modifyFailure (failure) {
		if (/^Misnamed import\./.test(failure.failure)) {
			const node = utils.getTokenAtPosition(failure.sourceFile, failure.getStartPosition().getPosition());

			if (utils.isImportDeclaration(node.parent) && utils.isLiteralExpression(node.parent.moduleSpecifier)) {
				failure.failure += ` for '${node.parent.moduleSpecifier.text}'`;
			}
		}

		return failure;
	}
});
