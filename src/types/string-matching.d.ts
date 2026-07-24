// `string-matching` (https://github.com/MayamaTakeshi/string-matching) ships no type
// declarations of its own, so we provide a minimal ambient shim covering the parts
// of its API that this package relies on.
declare module "string-matching" {
    export class MatchingError extends Error {
        path: string;
        reason: any;
        constructor(path: string, reason: any);
    }

    export type StringMatcherFn = (
        received: any,
        dict: Record<string, any>,
        throw_matching_error: boolean,
        path: string,
    ) => any;

    export function gen_matcher(expected: string): StringMatcherFn;
}
