const utils = require('tsutils');

module.exports = require('../dist')('tslint/lib/rules/interfaceNameRule', {
	modifyFailure (failure) {
		const node = utils.getTokenAtPosition(failure.sourceFile, failure.getStartPosition().getPosition());

		failure.failure = `Interface name "${node.getText()}" must not have an "I" prefix`;

		return failure;
	}
});
