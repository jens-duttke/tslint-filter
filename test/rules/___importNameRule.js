const Utils = require('tsutils');

module.exports = require('../../dist')('tslint-microsoft-contrib/importNameRule', {
	suppressErrors: true,
	modifyFailure (failure) {
		if (/^Misnamed import\./.test(failure.failure)) {
			const node = Utils.getTokenAtPosition(failure.sourceFile, failure.getStartPosition().getPosition());

			failure.failure += ` for '${node.parent.moduleSpecifier.text}'`
		}
		return failure;
	}
});
