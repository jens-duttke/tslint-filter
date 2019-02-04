const ts = require('typescript');
const utils = require('tsutils');

module.exports = require('../dist')('tslint/lib/rules/typedefRule', {
	modifyFailure (failure) {
		// Don't require return type definition of arrow functions, if it's assigned to a variable, which must also have a type definition
		if (failure.failure === 'expected arrow-call-signature to have a typedef' && this.ruleArguments.includes('variable-declaration')) {
			const node = utils.getTokenAtPosition(failure.sourceFile, failure.getStartPosition().getPosition());

			if (utils.isVariableDeclaration(node.parent.parent)) {
				return;
			}
		}

		return failure;
	}
});
