const utils = require('tsutils');

module.exports = require('../dist')('tslint-eslint-rules/dist/rules/spaceInParensRule', {
	/**
	 * @param {import('tslint').RuleFailure} [failure]
	 * @param {import('typescript').SourceFile} [sourceFile]
	 */
	modifyFailure (failure, sourceFile) {
		const node = utils.getTokenAtPosition(sourceFile, failure.getStartPosition().getPosition());

		if (!/^(\/\*.*?\*\/)*\s|\s(\/\*.*?\*\/)*$/.test(node.getFullText())) {
			return undefined;
		}

		return failure;
	}
});
