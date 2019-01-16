/*!
 * @fileOverview Suppress and modify failures, before they get returned by TSLint
 * @author <a href="mailto:github@duttke.de">Jens Duttke</a>
 */

'use strict';

import * as toRegexRange from 'to-regex-range';
import * as Lint from 'tslint';
import { AbstractRule } from 'tslint/lib/language/rule/abstractRule';
import * as ts from 'typescript';

interface Linter {
	Rule: Lint.RuleConstructor;
}

interface AddFilterOptions {
	modifyFailure? (failure: Lint.RuleFailure): Lint.RuleFailure | undefined;
}

type RuleApply =  (sourceFile: ts.SourceFile) => Lint.RuleFailure[];

module.exports = function addFilter (ruleFile: string, options: AddFilterOptions = { }): Linter {
	const linter: Linter = require(ruleFile) as Linter;
	const ruleName: string = linter.Rule.metadata.ruleName;

	const RulePrototype: Lint.IRule = linter.Rule.prototype as Lint.IRule;
	const originalApply: RuleApply = RulePrototype.apply;

	RulePrototype.apply = function apply (this: AbstractRule, sourceFile: ts.SourceFile): Lint.RuleFailure[] {
		const lastRuleArgument: any = this.ruleArguments[this.ruleArguments.length - 1];

		if (!Array.isArray(lastRuleArgument)) {
			throw new Error(`No filter configuration given for rule "${ruleName}"`);
		}

		const ignorePatterns: RegExp[] = lastRuleArgument.map(stringToRegExp);

		Object.defineProperty(this, 'ruleArguments', {
			value: this.ruleArguments.slice(0, -1),
			writable: false
		});

		let failures: Lint.RuleFailure[] = originalApply.call(this, sourceFile) as Lint.RuleFailure[];

		if (typeof options.modifyFailure === 'function') {
			failures = failures.map(options.modifyFailure).filter(isFailure);
		}

		failures = failures.filter((failure) => !ignorePatterns.some((regex) => regex.test(failure.getFailure())));

		return failures;
	};

	return linter;
};

function stringToRegExp (str: string): RegExp {
	return new RegExp(
		str.replace(/\[(\d*)\.\.\.(\d*)\]/g, (_match: string, p1: string, p2: string) =>
			toRegexRange(p1 !== '' ? p1 : -999999999999999, p2 !== '' ? p2 : 999999999999999, { shorthand: true })
		)
	);
}

function isFailure (failure: Lint.RuleFailure | undefined): failure is Lint.RuleFailure {
	return failure !== undefined;
}
