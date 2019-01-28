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
type RuleApplyWithProgram =  (sourceFile: ts.SourceFile, program: ts.Program) => Lint.RuleFailure[];
type RuleApplyAny = RuleApply | RuleApplyWithProgram;

function addFilter (ruleFile: string, options: AddFilterOptions = { }): Linter {
	const linter: Linter = require(ruleFile) as Linter;
	const RulePrototype: Lint.IRule | Lint.ITypedRule = linter.Rule.prototype as Lint.IRule | Lint.ITypedRule;

	if (Lint.isTypedRule(RulePrototype)) {
		RulePrototype.applyWithProgram = applyWithFilter(linter, RulePrototype.applyWithProgram, ruleFile, options);
	}
	else {
		RulePrototype.apply = applyWithFilter(linter, RulePrototype.apply, ruleFile, options);
	}

	return linter;
}

/*
	Makes it possible to include predefined rules by using:
	"extends": ["tslint-filter"]
*/
addFilter.rulesDirectory = '../rules';

module.exports = addFilter;

function applyWithFilter (linter: Linter, originalApplyMethod: RuleApply, ruleFile: string, options: AddFilterOptions): RuleApply;
function applyWithFilter (linter: Linter, originalApplyMethod: RuleApplyWithProgram, ruleFile: string, options: AddFilterOptions): RuleApplyWithProgram;
function applyWithFilter (linter: Linter, originalApplyMethod: RuleApplyAny, ruleFile: string, options: AddFilterOptions): RuleApplyAny {
	const ruleName: string = linter.Rule.metadata.ruleName;

	return function (this: AbstractRule, sourceFile: ts.SourceFile, program?: ts.Program): Lint.RuleFailure[] {
		const ignorePatterns: RegExp[] = extractIgnorePatterns(ruleName, this.ruleArguments);

		// @ts-ignore
		((this.options as object).ruleName as string) = ruleName;
		this.ruleName = ruleName;

		let failures: Lint.RuleFailure[];

		try {
			if (program === undefined) {
				failures = (originalApplyMethod as RuleApply).call(this, sourceFile);
			}
			else {
				failures = (originalApplyMethod as RuleApplyWithProgram).call(this, sourceFile, program);
			}
		}
		catch (error) {
			failures = [getFailureByError(error, ruleFile, this.ruleName, sourceFile)];
		}

		if (typeof options.modifyFailure === 'function') {
			failures = failures.map(options.modifyFailure).filter(isFailure);
		}

		failures = failures.filter((failure) => !ignorePatterns.some((regex) => regex.test(failure.getFailure())));

		return failures;
	};
}

function extractIgnorePatterns (ruleName: string, ruleArguments: any[]): RegExp[] | never {
	const lastRuleArgument: any = ruleArguments[ruleArguments.length - 1];

	if (!Array.isArray(lastRuleArgument)) {
		throw new Error(`No filter configuration given for rule '${ruleName}'`);
	}

	const ignorePatterns: RegExp[] = lastRuleArgument.map(stringToRegExp);

	// tslint:disable-next-line:no-parameter-reassignment
	ruleArguments = ruleArguments.slice(0, -1);

	return ignorePatterns;
}

function stringToRegExp (str: string): RegExp {
	return new RegExp(
		str.replace(/\[(\d*)\.\.\.(\d*)\]/g, (_match: string, p1: string, p2: string) =>
			toRegexRange(p1 !== '' ? p1 : -999999999999999, p2 !== '' ? p2 : 999999999999999, { shorthand: true })
		)
	);
}

function getFailureByError (error: any, ruleFile: string, originalRuleName: string, sourceFile: ts.SourceFile): Lint.RuleFailure {
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

	return new Lint.RuleFailure(sourceFile, 0, 1, `${title} in '${ruleFile}': ${message}. Rule is disabled for this file`, originalRuleName);
}

function isFailure (failure: Lint.RuleFailure | undefined): failure is Lint.RuleFailure {
	return failure !== undefined;
}
