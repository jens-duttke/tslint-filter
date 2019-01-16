[![npm version](https://badge.fury.io/js/tslint-filter.svg)](https://badge.fury.io/js/tslint-filter)
[![Known Vulnerabilities](https://snyk.io/test/github/jens-duttke/tslint-filter/badge.svg?targetFile=package.json)](https://snyk.io/test/github/jens-duttke/tslint-filter?targetFile=package.json)

# TSLint-Filter
Suppress and modify TSLint warnings, before they get returned to the console or your code editor.

**Table of Contents** 

- [Use Cases](#use-cases)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Extended Usage](#extended-usage)
- [Location of Rule Directories](#location-of-rule-directories)
- [Rule File Names](#rule-file-names)

## Use Cases

Many TSLint rules are very limited by their configurability, and some rules looks like they are not thought to the end.

For example, I want to prevent the usage of "I" as prefix for interface names. The TSLint rule for that is called "interface-name".  
Unfortunately, this rule also shows an error for "I18N", which is an absolutely valid interface name for me.

Or, in my React projects I want to get a warning, if I forgot to specify a Components class method as `private` or `public` using the "member-access" rule. But for the React methods `componentDidMount`, `render`, `componentDidUpdate` etc. I don't want to specify that, because they are always public.  
Unfortunately, by now, it's not possible to specify a whitelist here.

Or, I want to prefer conditional expressions for small, simple alignments, but "prefer-conditional-expression" also complains about complex statements, which wouldn't be easy readable in a single line, because this line would have a size of 300 characters or more.  
Why isn't there a way to show the warning only, if the conditional expression would be a ...let's say... less-than-120-chars-one-liner?  
Using TSLint Filter, you have to possibility to easily extend existing rules and suppress specific warnings, based on regular expressions.

It's even possible to use integer ranges in these regular expression, to filter by a range of numbers in the error message.

## Installation

Install with npm

```sh
npm install tslint-filter --save-dev
```

## Basic Usage

Since TSLint does not provide an easy way to modify warnings before they get returned, we need to create own rules, with TSLint-Filter as wrapper for the orignal rule.

But that's very easy:

Create a folder for custom rules in your project folder

In this folder create a JavaScript file like:
```javascript
module.exports = require('tslint-filter')('tslint/lib/rules/memberAccessRule');
```
"tslint/lib/rules/memberAccessRule" is the name of the original rule, which you want to extend.

You can name the file to whatever you want, but it must end with "Rule.js". I prefer th use the name of the original rule, and prefix it with "___", so in this case "___memberAccessRule.js".

In your `tslint.json` add the folder to the "rulesDirectory" section:
```json
{
	"rulesDirectory": [
		"script/custom-tslint-rules"
	],
	"rules": {
		...
	}
}
```

Now, instead of using the rule "member-access", I'm able to use the rule "___member-access".  
The last parameter **must** be always an array with regular expressions. Warnings which match these expressions will be ignored.

```json
"___member-access": [true, [
	"'(getDerivedStateFromProps|componentDidMount|shouldComponentUpdate|render|getSnapshotBeforeUpdate|componentDidUpdate|componentWillUnmount)'"
]],
```

## Extended Usage

Beside simply ignoring warnings, you can also manipulate them. You can change the message, implement a fix or whatever you like.

For example, we want to extend the "interface-name" rule, to allow the interface name "I18N", even if it starts with "I".  
Unfortunately, the message of this rule does not provide the name of the interface, so first, we have to include the name into the message:
```javascript
const Utils = require('tsutils');

module.exports = require('tslint-filter')('tslint/lib/rules/interfaceNameRule', {
	modifyFailure (failure) {
		const node = Utils.getTokenAtPosition(failure.sourceFile, failure.getStartPosition().getPosition());

		if (node.escapedText) {
			failure.failure = `Interface name "${node.escapedText}" must not have an "I" prefix`;
		}

		return failure;
	}
});
```

Now you can ignore interface names, starting with "I" followed by a digit:
```json
"___interface-name": [true, "never-prefix", [
	"Interface name \"I[\\d]"
]],
```


For example the "prefer-conditional-expression" rule could be extended to show the approximated number of characters you could save, and also the approximated size if you write the statement as conditional expression:

```javascript
const Utils = require('tsutils');

module.exports = require('tslint-filter')('tslint/lib/rules/preferConditionalExpressionRule', {
	modifyFailure (failure) {
		const match = failure.getFailure().match(/'([^\0]+)'/);

		if (match !== null) {
			const node = Utils.getTokenAtPosition(failure.sourceFile, failure.getStartPosition().getPosition());
			const parent = node.parent;

			const originalSize = (parent.end - parent.pos);

			const assigneeLength = match[1].length;
			const expressionLength = parent.expression.end - parent.expression.pos;
			const thenStatementLength = parent.thenStatement.getText().replace(/^{?[\s\n]+|[\s\n]+}?$/g, '').length;
			const elseStatementLength = parent.elseStatement.getText().replace(/^{?[\s\n]+|[\s\n]+}?$/g, '').length;

			// That's only an approximated size, depending on the wrapping characters
			newLength = expressionLength + thenStatementLength + elseStatementLength - assigneeLength + 1;

			if (newLength > originalSize) {
				return;
			}

			failure.failure = `${failure.failure} (save about ${originalSize - newLength} characters, conditional expression size would be about ${newLength} characters)`
		}

		return failure;
	}
});
```
Save this file under the name "___preferConditionalExpressionRule.js" in your custom rule folder.

Now you can use this pattern, to prevent warnings, where the conditional expression size would be 120 characters or more:
```json
"___prefer-conditional-expression": [true, "check-else-if", [
	"conditional expression size would be about [120...]"
]],
```

Ranges can be specified with:
| RegExp character sets | Meaning
|---|---
| `[-5...5]` | Any integer number from -5 to 5
| `[...100]` | Any integer number from -999999999999999 to 100
| `[10...]`  | Any integer number from 10 to 999999999999999
| `[...]`    | Any integer number from -999999999999999 to 999999999999999, but if possible you should prefer `-?\d+`

`-999999999999999` and `999999999999999` are required, because the expression is converted into a valid RegExp, and here we always need to specify a range.  
These numbers are choosen because they are very near to Number.MIN_SAFE_INTEGER and Number.MAX_SAFE_INTEGER, but the RegExp representation is still very short.

## Location of Rule Directories

> It's an open to-do to determine the directory and rule file name automatically, based on the `rulesDirectory`, but I havn't found an easy way to do that yet.

So, for now, it's required to specify the whole path to the rule, instead of just using the rule name.

| Rule Package | Directory | Number of rules\*
|---|---|---:
| [tslint](https://www.npmjs.com/package/tslint)                                                         | tslint/lib/rules/                        | 152
| [tslint-microsoft-contrib](https://www.npmjs.com/package/tslint-microsoft-contrib)                     | tslint-microsoft-contrib/                | 93
| [tslint-sonarts](https://www.npmjs.com/package/tslint-sonarts)                                         | tslint-sonarts/lib/rules/                | 62
| [tslint-eslint-rules](https://www.npmjs.com/package/tslint-eslint-rules)                               | tslint-eslint-rules/dist/rules/          | 38
| [rxjs-tslint-rules](https://www.npmjs.com/package/rxjs-tslint-rules)                                   | rxjs-tslint-rules/dist/rules/            | 37
| [tslint-consistent-codestyle](https://www.npmjs.com/package/tslint-consistent-codestyle)               | tslint-consistent-codestyle/rules/       | 19
| [tslint-config-security](https://www.npmjs.com/package/tslint-config-security)                         | tslint-config-security/dist/rules/       | 16
| [tslint-immutable](https://www.npmjs.com/package/tslint-immutable)                                     | tslint-immutable/rules/                  | 15
| [tslint-misc-rules](https://www.npmjs.com/package/tslint-misc-rules)                                   | tslint-misc-rules/rules/                 | 15
| [tslint-react](https://www.npmjs.com/package/tslint-react)                                             | tslint-react/rules/                      | 15
| [tslint-clean-code](https://www.npmjs.com/package/tslint-clean-code)                                   | tslint-clean-code/dist/src/              | 12
| [tslint-stencil](https://www.npmjs.com/package/tslint-stencil)                                         | tslint-stencil/rules/                    | 7
| [vrsource-tslint-rules](https://www.npmjs.com/package/vrsource-tslint-rules)                           | vrsource-tslint-rules/rules/             | 7
| [rxjs-tslint](https://www.npmjs.com/package/rxjs-tslint)                                               | rxjs-tslint/                             | 4
| [tslint-jasmine-rules](https://www.npmjs.com/package/tslint-jasmine-rules)                             | tslint-jasmine-rules/dist/               | 3
| [tslint-defocus](https://www.npmjs.com/package/tslint-defocus)                                         | tslint-defocus/dist/                     | 1
| [tslint-lines-between-class-members](https://www.npmjs.com/package/tslint-lines-between-class-members) | tslint-lines-between-class-members/      | 1
| [tslint-no-unused-expression-chai](https://www.npmjs.com/package/tslint-no-unused-expression-chai)     | tslint-no-unused-expression-chai/rules/  | 1
| [tslint-origin-ordered-imports-rule](https://www.npmjs.com/package/tslint-origin-ordered-imports-rule) | tslint-origin-ordered-imports-rule/dist/ | 1
| [tslint-plugin-prettier](https://www.npmjs.com/package/tslint-plugin-prettier)                         | tslint-plugin-prettier/rules/            | 1

\* as of 2019-01-16. List ordered by number of rules.

## Rule File Names

Dashes in the file names are converted to camel case, but leading and trailing dashes are keeped. "Rule" is appeneded

So, the rule name `-ab-cd-ef-` is located in the file `-abCdEf-Rule`.
