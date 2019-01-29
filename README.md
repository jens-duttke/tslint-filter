[![npm version](https://badge.fury.io/js/tslint-filter.svg)](https://badge.fury.io/js/tslint-filter)
[![Dependency Status](https://img.shields.io/david/jens-duttke/tslint-filter.svg)](https://www.npmjs.com/package/tslint-filter)
[![Known Vulnerabilities](https://snyk.io/test/github/jens-duttke/tslint-filter/badge.svg?targetFile=package.json)](https://snyk.io/test/github/jens-duttke/tslint-filter?targetFile=package.json)
[![npm](https://img.shields.io/npm/dm/tslint-filter.svg?maxAge=2592000)](https://www.npmjs.com/package/tslint-filter)
[![MIT license](https://img.shields.io/github/license/jens-duttke/tslint-filter.svg?style=flat)](https://opensource.org/licenses/MIT)

# TSLint-Filter
Suppress and modify TSLint linting errors, before they get returned to the console or your code editor.

**Table of Contents**

- [Use Cases](#use-cases)
  - [Ignore specific linting errors](#ignore-specific-linting-errors)
  - [Extend rules](#extend-rules)
  - [Handle JavaScript errors in rules](#handle-javascript-errors-in-rules)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Extended Usage](#extended-usage)
- [Predefined rule wrappers](#predefined-rule-wrappers)
- [Disable/enable rules by their original name in comment flags in source code](#disableenable-rules-by-their-original-name-in-comment-flags-in-source-code)
- [Location of Rule Directories](#location-of-rule-directories)
- [Rule File Names](#rule-file-names)

## Use Cases

Many TSLint rules are very limited by their configurability, and some rules looks like they are not thought to the end.

### Ignore specific linting errors

For example, I want to prevent the usage of "I" as prefix for interface names. The TSLint rule for that is called "interface-name".<br />
Unfortunately, this rule also shows an error for "I18N", which is an absolutely valid interface name to me.

Or, in my React projects I want to get a linting error, if I forgot to specify a Components class method as `private` or `public` using the "member-access" rule. But for the React methods `componentDidMount`, `render`, `getDerivedStateFromProps` etc. I don't want to specify that, because they are always public.<br />
Unfortunately, by now, it's not possible to specify a whitelist here.

### Extend rules

I want to prefer conditional expressions for small, simple alignments, but "prefer-conditional-expression" also complains about complex statements, which wouldn't be easy readable in a single line, because this line would have a size of 300 characters or more.<br />
Why isn't there a way to show the linting error only, if the conditional expression would be a ...let's say... less-than-120-chars-one-liner?

Using TSLint-Filter, you have to possibility to easily extend existing rules and suppress specific linting errors, based on regular expressions.

It's even possible to use integer ranges in these regular expression, to filter by a range of numbers in the error message.

### Handle JavaScript errors in rules

At this time (2019-01-17), the [tslint-microsoft-contrib](https://www.npmjs.com/package/tslint-microsoft-contrib) rule "import-name" throws an error for empty imports (imports of modules for side efffects only) like
```javascript
import './polyfill'
```
While TSLint doesn't handle such JavaScript errors, your code editor may suppress this error silently and may stop linting your whole project or atleast the current file, so that you think your files are free of issues, because your editor doesn't show any.

TSLint-Filter catches such JavaScript errors and show them as normal linter errors for the first character of a file, so that you get visual feedback, that there's something wrong.

Using the filter ability of TSLint-Filter you are then also able to suppress the specific error, without to affect the execution of other rules.

> Don't forget to report errors to rule authors, so that they are able to fix them!

## Installation

Install with npm

```sh
npm install tslint-filter --save-dev
```

## Basic Usage

Since TSLint does not provide an easy way to modify linting errors before they get returned, we need to create own rules, with TSLint-Filter as wrapper for the original rule.

But that's very easy:

Either use one of the [predefined rule wrappers](#predefined-rule-wrappers), or create a folder for custom rules in your project folder

In this folder create a JavaScript file like this:
```javascript
module.exports = require('tslint-filter')('tslint/lib/rules/memberAccessRule');
```
"tslint/lib/rules/memberAccessRule" is the name of the original rule, which you want to extend.

You can name the file to whatever you want, but it must end with "Rule.js". I prefer to use the name of the original rule, and prefix it with "___" (3x underscore), so in this case "___memberAccessRule.js".

In your `tslint.json` add the folder to the "rulesDirectory" section:
```json
{
  "rulesDirectory": [
    "script/custom-tslint-rules"
  ],
  "rules": {
```

Now, instead of using the rule "member-access", I'm able to use the rule "___member-access".<br />
The last parameter **must** be always an array with regular expressions. Linting errors which match these expressions will be ignored.

```json
"___member-access": [true, [
  "'(getDerivedStateFromProps|componentDidMount|shouldComponentUpdate|render|getSnapshotBeforeUpdate|componentDidUpdate|componentWillUnmount)'"
]],
```

## Extended Usage

Beside simply ignoring linting errors, you can also manipulate them. You can change the message, implement a fix or whatever you like.

For example, we want to extend the "interface-name" rule, to allow the interface name "I18N", even if it starts with "I".<br />
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

      failure.failure = `${failure.failure} (save about ${originalSize - newLength} characters, conditional expression size would be about ${newLength} characters)`;
    }

    return failure;
  }
});
```
Save this file under the name "___preferConditionalExpressionRule.js" in your custom rule folder.

Now you can use this pattern, to prevent linting errors, where the conditional expression size would be 120 characters or more:
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
| `[...]`    | Any integer number from -999999999999999 to 999999999999999,<br />but if possible you should prefer `-?\d+`

`-999999999999999` and `999999999999999` are required, because the expression is converted into a valid RegExp, and here we always need to specify a range.<br />
These numbers are choosen because they are very near to Number.MIN_SAFE_INTEGER and Number.MAX_SAFE_INTEGER, but the RegExp representation is still very short.

## Predefined rule wrappers

The TSLint-Filter package contains a couple of predefined rule wrappers, which I'm using in my projects.
You can simply include them in your projects by adding `"extends": ["tslint-filter"]` to your `tslint.json`, or by adding `"node_modules/tslint-filter/rules"` to the `"rulesDirectory"` section.

| Rule Name | Original Rule Package | Description
|---|---|---
| ___import-name                   | tslint-microsoft-contrib | Adds the full import path to the message.<br /><sub>**Original message:**<br />Misnamed import. Import should be named 'xyz' but found 'zyx'<br />**New message:**<br />Misnamed import. Import should be named 'xyz' but found 'zyx' for './my-modules/xyz'</sub>
| ___interface-name                | tslint                   | Adds the criticized interface name to the message.<br /><sub>**Original message:**><br />Interface name must not have an "I" prefix<br />**New message:**<br />Interface name "I18N" must not have an "I" prefix</sub>
| ___match-default-export-name     | tslint                   | Adds the full import path to the message.<br /><sub>**Original message:**<br />Expected import 'xyz' to match the default export 'zyx'.<br />**New message:**<br />Expected import 'xyz' of module './my-modules/xyz' to match the default export 'zyx'.</sub>
| ___member-access                 | tslint                   | Nothing special. Just enables the ability to filter specific linting errors in the `tslint.json`.
| ___prefer-conditional-expression | tslint                   | Adds an estimation of the saved characters, and the new size to the message.<br /><sub>**Original message:**<br />Use a conditional expression instead of assigning to 'myVar' in multiple places.<br />**New message:**<br />Use a conditional expression instead of assigning to 'myVar' in multiple places. (save about 36 characters, conditional expression size would be about 29 characters)</sub>
| ___strict-boolean-expressions    | tslint                   | Nothing special. Just enables the ability to filter specific linting errors in the `tslint.json`.
| ___typedef                       | tslint                   | Nothing special. Just enables the ability to filter specific linting errors in the `tslint.json`.

## Disable/enable rules by their original name in comment flags in source code

TSLint allows you to enable or disable specific rules by their name directly in the source code, like
```javascript
// tslint:disable-next-line:rule-name
```
Normally, the `rule-name` is the name of the rule you use in your `tslint.json`. That would mean, if you change `interface-name` to `___interface-name`, you would also need to update all comments which are using this rule name.

To avoid that, TSLint-Filter pretend to have the name of the original rule, so you don't need to change anything.

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

Dashes in the file names are converted to camel-case, but leading and trailing dashes are keeped. "Rule" is appended.

So, the rule name `-ab-cd-ef-` is located in the file `-abCdEf-Rule`.
