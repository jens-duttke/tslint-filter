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

function addFilter (ruleFile: string, options: AddFilterOptions = { }): Linter {
	const linter: Linter = require(ruleFile) as Linter;
	const ruleName: string = linter.Rule.metadata.ruleName;

	const RulePrototype: Lint.IRule = linter.Rule.prototype as Lint.IRule;
	const originalApply: RuleApply = RulePrototype.apply;

	RulePrototype.apply = function apply (this: AbstractRule, sourceFile: ts.SourceFile): Lint.RuleFailure[] {
		const lastRuleArgument: any = this.ruleArguments[this.ruleArguments.length - 1];

		if (!Array.isArray(lastRuleArgument)) {
			throw new Error(`No filter configuration given for rule '${ruleName}'`);
		}

		const ignorePatterns: RegExp[] = lastRuleArgument.map(stringToRegExp);

		Object.defineProperty(this, 'ruleArguments', {
			value: this.ruleArguments.slice(0, -1),
			writable: false
		});

		let failures: Lint.RuleFailure[];

		try {
			failures = originalApply.call(this, sourceFile);
		}
		catch (error) {
			let title: string;
			let message: string;

			if (error instanceof Error) {
				title = error.name;
				message = error.message;
			}
			else if (typeof error === 'string') {
				title = 'Error';
				message = error;
			}
			else {
				title = 'Unhandled error';
				if (
					error !== null &&
					error !== undefined
				) {
					message = `Unknown error of type ${(error as { }).constructor.name}`;
				}
				else {
					message = `Unknown error of type '${typeof error as any}'`;
				}
			}

			failures = [
				new Lint.RuleFailure(
					sourceFile,
					0, 1,
					`${title} in '${ruleFile}': ${message}. Rule is disabled for this file`,
					this.ruleName
				)
			];
		}

		if (typeof options.modifyFailure === 'function') {
			failures = failures.map(options.modifyFailure).filter(isFailure);
		}

		failures = failures.filter((failure) => !ignorePatterns.some((regex) => regex.test(failure.getFailure())));

		return failures;
	};

	return linter;
}

/*
	Make it possible to include predefined rules by using:
	"extends": ["tslint-filter"]
*/
addFilter.rulesDirectory = '../rules';

module.exports = addFilter;

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
