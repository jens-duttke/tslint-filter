const Utils = require('tsutils');

module.exports = require('../dist')('tslint/lib/rules/matchDefaultExportNameRule', {
	modifyFailure (failure) {
		const node = Utils.getTokenAtPosition(failure.sourceFile, failure.getStartPosition().getPosition());
		const moduleSpecifier = node.parent.parent.importClause.parent.moduleSpecifier.text

		failure.failure = failure.failure.replace(
			/^Expected import '(.+?)' to match the default export '(.+?)'.$/,
			(_match, p1, p2) => `Expected import '${p1}' of module '${moduleSpecifier}' to match the default export '${p2}'.`
		);

		return failure;
	}
});
