const Utils = require('tsutils');

module.exports = require('../dist')('tslint/lib/rules/interfaceNameRule', {
	modifyFailure (failure) {
		const node = Utils.getTokenAtPosition(failure.sourceFile, failure.getStartPosition().getPosition());

		if (node.escapedText) {
			failure.failure = `Interface name "${node.escapedText}" must not have an "I" prefix`;
		}

		return failure;
	}
});
