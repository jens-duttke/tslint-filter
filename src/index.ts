/*!
 * @fileOverview Suppress and extend failures, before they get returned by TSLint
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
	const linterOrError: Linter | Error = getLinter(ruleFile);

	if (linterOrError instanceof Error) {
		const error: Error = linterOrError;

		class Rule extends Lint.Rules.AbstractRule {
			public static metadata: Lint.IRuleMetadata = {
				ruleName: getRuleNameByFileName(ruleFile),
				type: 'functionality',
				description: `Error while loading '${ruleFile}'.`,
				optionsDescription: 'Not configurable.',
				options: null,
				typescriptOnly: false
			};

			public apply (sourceFile: ts.SourceFile): Lint.RuleFailure[] {
				return [getFailureByError(error, ruleFile, this.ruleName, sourceFile)];
			}
		}

		return { Rule };
	}

	const linter: Linter = linterOrError;
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

function getLinter (ruleFile: string): Linter | Error {
	try {
		return require(ruleFile) as Linter;
	}
	catch (error) {
		if (error instanceof Error) {
			return error;
		}

		return new Error(`Unable to load ${ruleFile}.`);
	}
}

function applyWithFilter (linter: Linter, originalApplyMethod: RuleApply, ruleFile: string, options: AddFilterOptions): RuleApply;
function applyWithFilter (linter: Linter, originalApplyMethod: RuleApplyWithProgram, ruleFile: string, options: AddFilterOptions): RuleApplyWithProgram;
function applyWithFilter (linter: Linter, originalApplyMethod: RuleApplyAny, ruleFile: string, options: AddFilterOptions): RuleApplyAny {
	const ruleName: string = linter.Rule.metadata.ruleName;

	return function (this: AbstractRule, sourceFile: ts.SourceFile, program?: ts.Program): Lint.RuleFailure[] {
		// @ts-ignore
		(this.options as object).ruleName = ruleName;
		this.ruleName = ruleName;

		const ignorePatternsOrFailure: RegExp[] | undefined | Lint.RuleFailure = extractIgnorePatterns(this, sourceFile);

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
			const modifyFailure: (
				failure: Lint.RuleFailure,
				sourceFile: ts.SourceFile,
				program: ts.Program | undefined
			) => Lint.RuleFailure | string | undefined = options.modifyFailure.bind(this);

			failures = failures
				.map((failure: Lint.RuleFailure): Lint.RuleFailure | undefined => updateFailure(sourceFile, failure, modifyFailure(failure, sourceFile, program)))
				.filter(isFailure);
		}

		if (ignorePatternsOrFailure instanceof Lint.RuleFailure) {
			failures.push(ignorePatternsOrFailure);
		}
		else if (ignorePatternsOrFailure !== undefined) {
			failures = failures.filter((failure: Lint.RuleFailure): boolean => (
				!ignorePatternsOrFailure.some(
					(regex: RegExp): boolean => regex.test(failure.getFailure())
				)
			));
		}

		return failures;
	};
}

function getRuleNameByFileName (ruleFile: string): string {
	return ruleFile.replace(/^.*\/|Rule\.?.*$/g, '').replace(/([A-Z])/g, '-$1').toLowerCase();
}

function extractIgnorePatterns (rule: Lint.Rules.AbstractRule, sourceFile: ts.SourceFile): RegExp[] | undefined | Lint.RuleFailure {
	const ruleArguments: any[] = rule.getOptions().ruleArguments;
	const lastRuleArgument: any = ruleArguments[ruleArguments.length - 1];

	if (!Array.isArray(lastRuleArgument)) {
		return undefined;
	}

	let ignorePatterns: RegExp[];

	try {
		ignorePatterns = lastRuleArgument.map(stringToRegExp);
	}
	catch (error) {
		if (error instanceof Error) {
			return new Lint.RuleFailure(sourceFile, 0, 1, `TSLint-Filter ignore pattern: ${error.message}`, rule.ruleName);
		}

		return undefined;
	}

	// @ts-ignore
	rule.ruleArguments = ruleArguments.slice(0, -1);
	// @ts-ignore
	(rule.options as object).ruleArguments = rule.ruleArguments;

	return ignorePatterns;
}

function stringToRegExp (str: string): RegExp {
	return new RegExp(
		str.replace(/\[(\d*)\.\.\.(\d*)\]/g, (_match: string, p1: string, p2: string): string =>
			toRegexRange(p1 !== '' ? p1 : -999999999999999, p2 !== '' ? p2 : 999999999999999, { shorthand: true })
		)
	);
}

function getFailureByError (error: any, ruleFile: string, originalRuleName: string, sourceFile: ts.SourceFile): Lint.RuleFailure {
	let title: string;
	let message: string;

	if (error instanceof Error) {
		title = error.name;

		/**
		 * Only show the first line of the message, to suppress the stack trace,
		 * attached to the error message in Node.js 12 (https://github.com/nodejs/node/pull/25690)
		 */
		message = error.message.replace(/\n.+/g, '');
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

function updateFailure (sourceFile: ts.SourceFile, failure: Lint.RuleFailure, newFailure: Lint.RuleFailure | string | undefined): Lint.RuleFailure | undefined {
	if (typeof newFailure === 'string') {
		return new Lint.RuleFailure(
			sourceFile,
			failure.getStartPosition().getPosition(),
			failure.getEndPosition().getPosition(),
			newFailure,
			failure.getRuleName(),
			failure.getFix()
		);
	}

	return newFailure;
}

function isFailure (failure: Lint.RuleFailure | undefined): failure is Lint.RuleFailure {
	return failure !== undefined;
}
