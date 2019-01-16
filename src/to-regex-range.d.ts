declare module 'to-regex-range' {
	interface Options {
		capture?: boolean;
		shorthand?: boolean;
		relaxZeros?: boolean;
	}

	const toRegexRange: (min: string | number, max: string | number, options: Options) => string;

	export = toRegexRange;
}
