const utils = require('tsutils');

module.exports = require('../dist')('tslint/lib/rules/interfaceNameRule', {
	/**
	 * @param {import('tslint').RuleFailure} [failure]
	 * @param {import('typescript').SourceFile} [sourceFile]
	 */
	modifyFailure (failure, sourceFile) {
		const node = utils.getTokenAtPosition(sourceFile, failure.getStartPosition().getPosition());

		return `Interface name "${node.getText()}" must not have an "I" prefix`;
	}
});
