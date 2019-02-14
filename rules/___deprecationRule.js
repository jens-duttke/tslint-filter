const utils = require('tsutils');
const ts = require('typescript');

module.exports = require('../dist')('tslint/lib/rules/deprecationRule', {
	/**
	 * @param {import('tslint').RuleFailure} [failure]
	 * @param {ts.SourceFile} [sourceFile]
	 * @param {ts.Program | undefined} [program]
	 */
	modifyFailure (failure, sourceFile, program) {
		const checker = program.getTypeChecker();
		const node = utils.getTokenAtPosition(sourceFile, failure.getStartPosition().getPosition()).parent;

		const type = checker.getTypeAtLocation(utils.isPropertyAccessExpression(node) ? node.expression : node);

		if (type.symbol) {
			if (type.symbol.declarations) {
				const declarations = type.symbol.declarations.map((declaration) => {
					let parent = declaration.parent;
					let path = [];

					while (parent) {
						if (ts.isInterfaceDeclaration(parent) || ts.isPropertySignature(parent)) {
							path.unshift(parent.name.getText());
						}

						parent = parent.parent;
					}

					return path.join('.');
				}).filter((item) => !!item);

				if (declarations.length > 1) {
					return `(${declarations.join(' | ')}).${failure.getFailure()}`;
				}
				else if (declarations.length === 1) {
					return `${declarations[0]}.${failure.getFailure()}`;
				}
			}

			return `${checker.getFullyQualifiedName(type.symbol)}.${failure.getFailure()}`;
		}

		return failure;
	}
});
