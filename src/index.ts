import * as _ from "lodash";
import * as sm from "string-matching";
import * as util from "util";
import { XMLParser } from "fast-xml-parser";

const MatchingError = sm.MatchingError;

const re_string_matching_indication = /(^|[^!])!{/;

// A `dict` accumulates values collected via `collect`/`push`/`pop` (aka `$`)
// while a match is being performed.
export type Dict = Record<string, any>;

// The common shape of every matcher function produced by this module.
// `received` is checked against whatever the closure captured as "expected".
export interface MatcherFn {
    (
        received: any,
        dict: Dict,
        throw_matching_error: boolean,
        path: string,
    ): any;
    __name__?: string;
    __original_data__?: any;
}

var non_zero: MatcherFn = (x, dict, throw_matching_error, path) => {
    if (typeof x != "number") {
        if (throw_matching_error)
            throw new MatchingError(path, "expected to be a number");
        return false;
    }

    if (x == 0) {
        if (throw_matching_error)
            throw new MatchingError(path, "expected to be non_zero");
        return false;
    }
    return "is non_zero";
};
non_zero.__name__ = "non_zero";

var non_blank_str: MatcherFn = (x, dict, throw_matching_error, path) => {
    if (typeof x != "string") {
        if (throw_matching_error)
            throw new MatchingError(path, "expected to be a string");
        return false;
    }

    if (x == "") {
        if (throw_matching_error)
            throw new MatchingError(path, "expected to be non_blank_str");
        return false;
    }
    return "non_blank_str";
};
non_blank_str.__name__ = "non_blank_str";

var str_equal = (s: any): MatcherFn => {
    var f: MatcherFn = (x, dict, throw_matching_error, path) => {
        if (x.toString() !== s.toString()) {
            if (throw_matching_error)
                throw new MatchingError(
                    path,
                    `not str_equal expected='${s}' received='${x}'`,
                );
            return false;
        }
        return "str_equal";
    };
    f.__name__ = `str_equal['${s}']`;
    return f;
};

type ValueType =
    | "array"
    | "undefined"
    | "null"
    | "dict"
    | "string"
    | "number"
    | "boolean"
    | "function"
    | "symbol"
    | "bigint";

var _typeof = (v: any): ValueType => {
    var t = typeof v;
    if (t === "object") {
        if (v instanceof Array) return "array";
        else if (v === undefined) return "undefined";
        else if (v === null) return "null";
        else return "dict";
    } else {
        return t as ValueType;
    }
};

var print_debug = (s: string) => {
    //console.error(s) // this actually is not an error. It is just to avoid messing with STDOUT from client code.
};

var _match_arrays = (
    expected: any[],
    received: any[],
    dict: Dict,
    full_match: boolean,
    throw_matching_error: boolean,
    path: string,
): any => {
    var reason;
    print_debug(`${path}: checking`);

    if (expected.length != received.length) {
        reason = `arrays lengths do not match: expected_len=${expected.length} received_len=${received.length}`;
        if (throw_matching_error) throw new MatchingError(path, reason);
        print_debug(`${path}: ${reason}`);
        return false;
    }
    for (var i = 0; i < expected.length; i++) {
        if (
            !_match(
                expected[i],
                received[i],
                dict,
                full_match,
                throw_matching_error,
                path + "[" + i + "]",
            )
        ) {
            return false;
        }
    }
    return "array matched";
};

var _match_dicts = (
    expected: Record<string, any>,
    received: Record<string, any>,
    dict: Dict,
    full_match: boolean,
    throw_matching_error: boolean,
    path: string,
): any => {
    var reason;
    print_debug(`${path}: checking`);

    var keys_e = new Set(Object.keys(expected));
    var keys_r = new Set(Object.keys(received));

    for (var key of keys_e) {
        print_debug(`${path}.${key}: checking`);
        var val_e = expected[key];
        if (val_e == absent) {
            if (keys_r.has(key)) {
                reason = "should be absent";
                if (throw_matching_error)
                    throw new MatchingError(`${path}.${key}`, reason);
                print_debug(`${path}.${key}: ${reason}`);
                return false;
            } else {
                print_debug(`${path}.${key}: absent as expected`);
            }
        } else {
            var rec = received[key];
            if (rec === undefined) {
                reason = "should be present";
                if (throw_matching_error)
                    throw new MatchingError(`${path}.${key}`, reason);
                print_debug(`${path}.${key}: ${reason}`);
                return false;
            }
            if (
                !_match(
                    expected[key],
                    rec,
                    dict,
                    full_match,
                    throw_matching_error,
                    path + "." + key,
                )
            ) {
                return false;
            }
        }
        print_debug(`${path}.${key}: matched`);
        keys_r.delete(key);
    }

    if (full_match) {
        if (keys_r.size > 0) {
            reason = `full match failed due extra keys [${Array.from(keys_r)}]`;
            if (throw_matching_error) throw new MatchingError(path, reason);
            print_debug(`${path}: ${reason}`);
            return false;
        }
    }
    return "object matched";
};

var collect = (var_name: string, matcher?: any): MatcherFn => {
    var f: MatcherFn = (val, dict, throw_matching_error, path) => {
        if (matcher) {
            if (
                !_match(matcher, val, dict, false, throw_matching_error, path)
            ) {
                return;
            }
        }

        if (typeof dict[var_name] == "undefined") {
            dict[var_name] = val;
            print_debug(`${path}: collect OK`);
            return true;
        } else {
            if (dict[var_name] != val) {
                var reason = `cannot set '${var_name}' to '${util.inspect(
                    val,
                )}' because it is already set to '${util.inspect(
                    dict[var_name],
                )}'`;
                if (throw_matching_error) throw new MatchingError(path, reason);
                print_debug(`${path}: ${reason}`);
                return false;
            }
            print_debug(
                `${path}: collect OK (found already set to same value)`,
            );
            return true;
        }
    };
    f.__name__ = `collect['${var_name}']`;
    return f;
};

var _match = (
    expected: any,
    received: any,
    dict: Dict,
    full_match: boolean,
    throw_matching_error: boolean,
    path: string,
): any => {
    var reason;

    var type_e = _typeof(expected);
    var type_r = _typeof(received);

    if (type_e == "undefined") {
        // this means to ignore received value
        print_debug(`${path}: required to be ignored`);
        return true;
    }

    if (type_e == type_r) {
        if (type_e == "array") {
            return _match_arrays(
                expected,
                received,
                dict,
                full_match,
                throw_matching_error,
                path,
            );
        } else if (type_e == "dict") {
            return _match_dicts(
                expected,
                received,
                dict,
                full_match,
                throw_matching_error,
                path,
            );
        }

        if (type_r == "function" && expected.__name__.startsWith("collect[")) {
            return expected(received, dict, throw_matching_error, path);
        }

        if (expected != received) {
            //console.error("throw_matching_error:", throw_matching_error)
            reason = `expected='${expected}' received='${received}'`;
            if (throw_matching_error) throw new MatchingError(path, reason);
            print_debug(`${path}: ${reason}`);
            return false;
        }

        //print_debug(`${path}: matched`)
        return "matched";
    }

    if (type_e == "function") {
        var res = expected(received, dict, throw_matching_error, path);
        if (res) print_debug(`${path}: ${res} (matched)`);
        return res;
    }

    if ((expected as any) === received) {
        return true;
    } else {
        var reason2 = `expected (${JSON.stringify(
            expected,
        )}) and received (${JSON.stringify(received)}) differ`;
        if (throw_matching_error) throw new MatchingError(path, reason2);
    }
};

var push = (var_name: string, matcher?: any): MatcherFn => {
    var f: MatcherFn = (val, dict, throw_matching_error, path) => {
        if (matcher) {
            if (
                !_match(matcher, val, dict, false, throw_matching_error, path)
            ) {
                return;
            }
        }

        if (typeof dict[var_name] == "undefined") {
            dict[var_name] = [val];
            return true;
        } else if (!Array.isArray(dict[var_name])) {
            var reason = `'${var_name}' is not an Array`;
            if (throw_matching_error) throw new MatchingError(path, reason);
            print_debug(`${path}: ${reason}`);
            return false;
        } else {
            dict[var_name].push(val);
            return true;
        }
    };
    f.__name__ = `push['${var_name}']`;
    return f;
};

var pop = (var_name: string, matcher?: any): MatcherFn => {
    var f: MatcherFn = (val, dict, throw_matching_error, path) => {
        if (matcher) {
            if (
                !_match(matcher, val, dict, false, throw_matching_error, path)
            ) {
                return;
            }
        }

        if (typeof dict[var_name] == "undefined") {
            var reason = `'${var_name}' is undefined`;
            if (throw_matching_error) throw new MatchingError(path, reason);
            print_debug(`${path}: ${reason}`);
            return false;
        } else if (!Array.isArray(dict[var_name])) {
            var reason = `'${var_name}' is not an Array`;
            if (throw_matching_error) throw new MatchingError(path, reason);
            print_debug(`${path}: ${reason}`);
            return false;
        } else {
            const idx = dict[var_name].indexOf(val);
            if (idx !== -1) {
                dict[var_name].splice(idx, 1);
                return true;
            } else {
                var reason2 = `${val} not found in the array ${var_name}`;
                if (throw_matching_error) throw new MatchingError(path, reason2);
                print_debug(`${path}: ${reason2}`);
                return false;
            }
        }
    };
    f.__name__ = `pop['${var_name}']`;
    return f;
};

const absent = (): string => {
    return "I am the absent function";
};
(absent as MatcherFn).__name__ = "absent";

const anything = (): boolean => {
    return true;
};
(anything as MatcherFn).__name__ = "anything";

var _deepMap = (obj: any, iterator: (val: any, key: any, obj: any) => any, context?: any): any => {
    return _.transform(obj, function (result: any, val: any, key: any) {
        var type_val = _typeof(val);
        result[key] =
            type_val == "array" || type_val == "dict"
                ? _deepMap(val, iterator, context)
                : iterator.call(context, val, key, obj);
    });
};

var matchify_strings = (evt: any): any => {
    if (typeof evt == "function") {
        return evt;
    }
    return _deepMap(evt, (x: any) => {
        if (typeof x == "string" && x.match(re_string_matching_indication)) {
            return sm.gen_matcher(x);
        } else {
            return x;
        }
    });
};

var partial_match = (expected: any): MatcherFn => {
    var expected2 = matchify_strings(expected);
    var f: MatcherFn = (received, dict, throw_matching_error, path) => {
        return _match(
            expected2,
            received,
            dict,
            false,
            throw_matching_error,
            path,
        );
    };
    f.__original_data__ = expected;
    f.__name__ = "partial_match";
    return f;
};

var full_match = (expected: any): MatcherFn => {
    var expected2 = matchify_strings(expected);
    var f: MatcherFn = (received, dict, throw_matching_error, path) => {
        return _match(
            expected2,
            received,
            dict,
            true,
            throw_matching_error,
            path,
        );
    };
    f.__original_data__ = expected;
    f.__name__ = "full_match";
    return f;
};

var json = (expected: any, full_match: boolean): MatcherFn => {
    var expected2 = matchify_strings(expected);
    var f: MatcherFn = (s, dict, throw_matching_error, path) => {
        var received = JSON.parse(s);
        return _match(
            expected2,
            received,
            dict,
            full_match,
            throw_matching_error,
            path,
        );
    };
    f.__original_data__ = expected;
    f.__name__ = "json" + (full_match ? "_full_match" : "_partial_match");
    return f;
};

var xml = (expected: any, full_match: boolean): MatcherFn => {
    var expected2 = matchify_strings(expected);
    var f: MatcherFn = (s, dict, throw_matching_error, path) => {
        var parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "",
            preserveOrder: true,
            //attributesGroupName: 'attrs', // cannot be use yet. See https://github.com/NaturalIntelligence/fast-xml-parser/issues/705
            //trimValues: true,
        });

        var received = parser.parse(s);

        return _match(
            expected2,
            received,
            dict,
            full_match,
            throw_matching_error,
            path,
        );
    };
    f.__original_data__ = expected;
    f.__name__ = "xml" + (full_match ? "_full_match" : "_partial_match");
    return f;
};

type Decoder = (s: any) => any;

var kv_str = (
    expected: any,
    param_sep: string,
    kv_sep: string,
    preparse_decoder: Decoder | undefined,
    postparse_decoder: Decoder | undefined,
    full_match: boolean,
): MatcherFn => {
    var expected2 = matchify_strings(expected);
    var f: MatcherFn = (s, dict, throw_matching_error, path) => {
        var received = s;
        if (preparse_decoder) {
            received = preparse_decoder(s);
        }
        received = _.chain(received)
            .split(param_sep)
            .map((s: string) => {
                var parts = s.split(kv_sep);
                var key = parts[0];
                var val: any = parts.slice(1).join(kv_sep);
                if (postparse_decoder) {
                    val = postparse_decoder(val);
                }
                return [key, val];
            })
            .fromPairs()
            .value();
        return _match(
            expected2,
            received,
            dict,
            full_match,
            throw_matching_error,
            path,
        );
    };
    f.__original_data__ = expected;
    f.__name__ = "kv_str" + (full_match ? "_full_match" : "_partial_match");
    return f;
};

// Decodes a application/x-www-form-urlencoded component: '+' means space and
// the rest follows the regular percent-encoding rules used by encodeURIComponent.
var decode_www_form_urlencoded_component = (s: string): string => {
    return decodeURIComponent(s.replace(/\+/g, " "));
};

var www_form_urlencoded = (
    expected: any,
    postparse_decoder: Decoder | undefined,
    full_match: boolean,
): MatcherFn => {
    var expected2 = matchify_strings(expected);
    var f: MatcherFn = (s, dict, throw_matching_error, path) => {
        if (typeof s !== "string") {
            if (throw_matching_error) {
                throw new MatchingError(
                    path,
                    `www_form_urlencoded expected a string but received ${typeof s}`,
                );
            }
            return false;
        }
        var received = _.chain(s)
            .split("&")
            .filter((part: string) => part.length > 0)
            .map((part: string) => {
                var parts = part.split("=");
                var key = decode_www_form_urlencoded_component(parts[0]);
                var val: any = decode_www_form_urlencoded_component(
                    parts.slice(1).join("="),
                );
                if (postparse_decoder) {
                    val = postparse_decoder(val);
                }
                return [key, val];
            })
            .fromPairs()
            .value();
        return _match(
            expected2,
            received,
            dict,
            full_match,
            throw_matching_error,
            path,
        );
    };
    f.__original_data__ = expected;
    f.__name__ =
        "www_form_urlencoded" + (full_match ? "_full_match" : "_partial_match");
    return f;
};

var matcher = (name: string, expected: (received: any) => any): MatcherFn => {
    if (typeof expected != "function") throw new Error("Must be a function");
    var f: MatcherFn = (received, dict, throw_matching_error, path) => {
        var res = expected(received);
        if (res == true) return true;

        if (throw_matching_error) {
            throw new MatchingError(path, res);
        }

        return false;
    };
    f.__name__ = name;
    return f;
};

var any_of = (matchers: any[], name?: string): MatcherFn => {
    var f: MatcherFn = (received, dict, throw_matching_error, path) => {
        var res;
        //we cannot use matchers.forEach() as a return doesn't interrupt iteration.
        for (var i = 0; i < matchers.length; i++) {
            var matcher = matchers[i];
            var dict_clone = _.cloneDeep(dict);
            res = _match(matcher, received, dict_clone, false, false, path);
            if (res) {
                _.assign(dict, dict_clone);
                if (name) {
                    dict[name] = received;
                }
                return res;
            }
        }
        if (throw_matching_error) {
            throw new MatchingError(path, "any_of no match");
        }
        return res;
    };
    f.__original_data__ = matchers;
    f.__name__ = "any_of";
    return f;
};

var unordered_list = (expected: any[]): MatcherFn => {
    return (received_list: any, dict: Dict, throw_matching_error: boolean, path: string) => {
        if (_typeof(received_list) != "array") {
            if (throw_matching_error) {
                throw new MatchingError(path, "unordered_list got non list");
            }
            return false;
        }

        if (expected.length != received_list.length) {
            var reason = `arrays lengths do not match: expected_len=${expected.length} received_len=${received_list.length}`;
            if (throw_matching_error) throw new MatchingError(path, reason);
            print_debug(`${path}: ${reason}`);
            return false;
        }

        var exp = _.cloneDeep(expected);

        for (var i = 0; i < received_list.length; i++) {
            var received = received_list[i];
            for (var j = 0; j < exp.length; j++) {
                var matcher = exp[j];
                var res = _match(matcher, received, dict, false, false, path);
                if (res) {
                    //remove element
                    exp.splice(j, 1);
                    break;
                }
            }
        }
        if (exp.length == 0) {
            return true;
        }
        if (throw_matching_error) {
            throw new MatchingError(path, "unordered_list no match");
        }
        return false;
    };
};

type Parser = (s: any) => any;
type Extractor = (data: any, key: string) => any;

var gen_gen_matcher = (parser: Parser, extractor: Extractor, name: string) => {
    return (expected: any): MatcherFn => {
        var expected2 = matchify_strings(expected);
        var f: MatcherFn = (s, dict, throw_matching_error, path) => {
            var received = parser(s);
            return _.every(expected2, (val: any, key: string) => {
                var item = extractor(received, key);
                if (val == absent && item) {
                    if (throw_matching_error) {
                        throw Error(`key ${path}.${key} expected to be absent`);
                    }
                    return false;
                }
                var full_match = false;
                return _match(
                    val,
                    item,
                    dict,
                    full_match,
                    throw_matching_error,
                    `${path}.${key}`,
                );
            });
        };
        f.__original_data__ = expected;
        f.__name__ = name;
        return f;
    };
};

const pop_match = (expected: any, array: any[], dict: Dict): any => {
    const throw_matching_error = false;
    const path = "";
    const full_match = false;

    var expected2 = matchify_strings(expected);

    var index: number | undefined = undefined;
    for (var i = 0; i < array.length; i++) {
        var item = array[i];
        if (typeof expected2 == "function") {
            if (expected2(item, dict, throw_matching_error, path)) {
                index = i;
                break;
            }
        } else {
            if (
                _match(
                    expected2,
                    item,
                    dict,
                    full_match,
                    throw_matching_error,
                    "",
                )
            ) {
                index = i;
                break;
            }
        }
    }

    if (index !== undefined && index >= 0) {
        return array.splice(index, 1)[0];
    }
    return undefined;
};

const reverse_pop_match = (item: any, array: any[], dict: Dict): any => {
    const throw_matching_error = false;
    const path = "";
    const full_match = false;

    var array2 = matchify_strings(array);

    var index: number | undefined = undefined;
    for (var i = 0; i < array2.length; i++) {
        var expected = array2[i];
        if (typeof expected == "function") {
            if (expected(item, dict, throw_matching_error, path)) {
                index = i;
                break;
            }
        } else {
            if (
                _match(
                    expected,
                    item,
                    dict,
                    full_match,
                    throw_matching_error,
                    "",
                )
            ) {
                index = i;
                break;
            }
        }
    }

    if (index !== undefined && index >= 0) {
        return array.splice(index, 1)[0];
    }
    return undefined;
};

var string_list = (separator: string, decoder: Decoder | undefined, expected: any): MatcherFn => {
    var expected2 = matchify_strings(expected);
    var f: MatcherFn = (s, dict, throw_matching_error, path) => {
        if (typeof s !== "string") {
            if (throw_matching_error) {
                throw new MatchingError(path, `string_list expected a string but received ${typeof s}`);
            }
            return false;
        }
        var parts: any[] = s.split(separator);
        if (decoder) {
            parts = parts.map(decoder);
        }
        return _match(expected2, parts, dict, false, throw_matching_error, path);
    };
    f.__original_data__ = expected;
    f.__name__ = "string_list";
    return f;
};

export {
    absent,
    non_zero,
    non_blank_str,
    str_equal,
    collect,
    collect as $,
    push,
    pop,
    partial_match,
    full_match,
    partial_match as pm,
    full_match as fm,
    json,
    xml,
    kv_str,
    www_form_urlencoded,
    any_of,
    unordered_list,
    matcher,
    matcher as m,
    string_list,
    matchify_strings,
    _match as match,
    MatchingError,
    anything as _,
    gen_gen_matcher,
    pop_match,
    reverse_pop_match,
};

export const json_partial_match = (expected: any): MatcherFn => {
    return json(expected, false);
};

export const json_full_match = (expected: any): MatcherFn => {
    return json(expected, true);
};

export const kv_str_partial_match = (
    expected: any,
    param_sep: string,
    kv_sep: string,
    preparse_decoder?: Decoder,
    postparse_decoder?: Decoder,
): MatcherFn => {
    return kv_str(
        expected,
        param_sep,
        kv_sep,
        preparse_decoder,
        postparse_decoder,
        false,
    );
};

export const kv_str_full_match = (
    expected: any,
    param_sep: string,
    kv_sep: string,
    preparse_decoder?: Decoder,
    postparse_decoder?: Decoder,
): MatcherFn => {
    return kv_str(
        expected,
        param_sep,
        kv_sep,
        preparse_decoder,
        postparse_decoder,
        true,
    );
};

export const www_form_urlencoded_partial_match = (
    expected: any,
    postparse_decoder?: Decoder,
): MatcherFn => {
    return www_form_urlencoded(expected, postparse_decoder, false);
};

export const www_form_urlencoded_full_match = (
    expected: any,
    postparse_decoder?: Decoder,
): MatcherFn => {
    return www_form_urlencoded(expected, postparse_decoder, true);
};
