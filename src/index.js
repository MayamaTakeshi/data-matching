var _ = require('lodash')
var sm = require('string-matching')
var util = require('util')

const re_string_matching_indication = /(^|[^!])!{/

var _null = (x) => { return !x ? true : false }

var _non_zero = (x) => {
	if(typeof x != 'number') return false

	return x != 0 
}

var _non_blank_str = (x) => {
	if(typeof x != 'string') return false

	return x != "" 
}

var _str_equal = (s) => {
	return (x) => {
		return x.toString() === s.toString()
	}
}

var _typeof = (v) => {
	var t = typeof v;
	if(t === 'object') {
		if(v instanceof Array)
			return 'array'
		else if(v === undefined)
			return 'undefined'
		else if(v === null)
			return 'null'
		else
			return 'dict'
	} else {
		return t
	}
}

var _match_arrays = (expected, received, dict, full_match, throw_matching_errors) => {
	print_debug("Checking [" + expected + "]")
	if(full_match) {
		if(expected.length != received.length) {
			if(throw_matching_errors) {
				throw new Error("Array lengths don't match")
			} else {
				return false
			}
		}
	}
	for(var i=0 ; i<expected.length ; i++) {
		if(!_match(expected[i], received[i], dict, full_match, throw_matching_errors)) {
			return false
		}	
	}
	print_debug("OK")
	return true;
}

var print_debug = (s) => {
		console.error(s) // this actually is not an error. It is just to avoid messing with STDOUT from client code.
}

var _match_dicts = (expected, received, dict, full_match, throw_matching_errors) => {
	var keys_e = new Set(Object.keys(expected))
	var keys_r = new Set(Object.keys(received))

	for(var key of keys_e) {
		print_debug("Checking " + key) 
		var val_e = expected[key]
		if(val_e == absent) {
			if(keys_r.has(key)) {
				if(throw_matching_errors) {
					throw new Error("Element " + key + " should be absent")
				} else {
					return false
				}
			} else {
				print_debug("OK: " + key + ' is absent')
			}
		} else {
			if(!keys_r.has(key)) {
				if(throw_matching_errors) {
					throw new Error("Expected element " + key + " not found")
				} else {
					print_debug("Key '" + key + "' absent")
					return false
				}
			}
			if(!_match(expected[key], received[key], dict, full_match, throw_matching_errors)) {
				if(throw_matching_errors) {
					throw new Error("No match for dict key '" + key + "'")
				} else {
					print_debug("No match for '" + key + "'")
					return false
				}
			}
		}

		print_debug("Check of '" + key + "' OK")
		keys_r.delete(key)
	}

	if(full_match) {
		if(keys_r.size > 0) {
			if(throw_matching_errors) {
				throw new Error("Dict full match failed")
			} else {
				print_debug("full_match failed due extra keys: [" + Array.from(keys_r) + ']')
				return false
			}
		}
	}
	print_debug("OK")
	return true
}

var _match = (expected, received, dict, full_match, throw_matching_errors) => {
	var type_e = _typeof(expected)
	var type_r = _typeof(received)

	if(type_e == 'undefined') {
		// this means to ignore received value
		return true
	}

	if(type_e == type_r) {
		if(type_e == 'array') {
			return _match_arrays(expected, received, dict, full_match, throw_matching_errors)
		} else if(type_e == 'dict') {
			return _match_dicts(expected, received, dict, full_match, throw_matching_errors)
		}
		if(expected != received) {
			if(throw_matching_errors) {
				throw new Error("Elements expected='" + expected + "' received='" + received + "' don't match")
			} else {
				return false
			}
		}

		print_debug("OK")
		return true
	}

	if(type_e == 'function') {
		var x
		try {
			var x = expected(received, dict)
			return x
		} catch(e) {
			console.error(e)
			throw e	
		}
	}

	return false
}

var collect = (var_name) => {
	return (val, dict) => {
		if(typeof dict[var_name] == 'undefined') {
			dict[var_name] = val
			return true
		} else {
			if(dict[var_name] != val) throw new Error("Cannot set " + var_name + " to " + util.inspect(val) + " because it is already set to " + util.inspect(dict[var_name]))
			return true
		}
	}
}

const absent = () => { return 'I am the absent function' }

var _deepMap = (obj, iterator, context) => {
    return _.transform(obj, function(result, val, key) {
				var type_val = _typeof(val)
        result[key] = type_val == 'array' || type_val == 'dict' ?
                            _deepMap(val, iterator, context) :
                            iterator.call(context, val, key, obj);
    });
}

var _matchify_strings = (evt, throw_matching_errors) => {
	return _deepMap(evt, (x) => {
		if(typeof x == 'string' && x.match(re_string_matching_indication)) {
			return sm.gen_matcher(x, throw_matching_errors)
		} else {
			return x
		}
	})
}

var partial_match = (expected, throw_matching_errors) => {
	var expected2 = _matchify_strings(expected, throw_matching_errors)
	var f =  (received, dict) => {
		return _match(expected2, received, dict, false, throw_matching_errors)
	}
	f.__original_data__ = expected
	f.__name__ = 'partial_match'
	return f
}

var full_match = (expected, throw_matching_errors) => {
	var expected2 = _matchify_strings(expected, throw_matching_errors)
	var f = (received, dict) => {
		return _match(expected2, received, dict, true, throw_matching_errors);
	}
	f.__original_data__ = expected
	f.__name__ = 'full_match'
	return f
}

var _json = (expected, full_match, throw_matching_errors) => {
	var expected2 = _matchify_strings(expected, throw_matching_errors)
	return (s, dict) => {
		var received = JSON.parse(s);
		return _match(expected2, received, dict, full_match, throw_matching_errors);
	}
}

var _kv_params_string = (expected, param_sep, kv_sep, string_decoder, full_match, throw_matching_errors) => {
	var expected2 = _matchify_strings(expected, throw_matching_errors)
	return (s, dict) => {
		var received = s;
		if(string_decoder) {
			received = string_decoder(s);
		}
		received = _.chain(received).split(param_sep).map((s) => { return s.split(kv_sep)}).fromPairs().value();
		return _match(expected2, received, dict, full_match, throw_matching_errors);
	}
}

module.exports = {
	pm: partial_match,
	fm: full_match,

	partial_match: partial_match,
	full_match: full_match,
	collect: collect,
	absent: absent,
	null: _null,
	non_zero: _non_zero,
	non_blank_str: _non_blank_str,

	json: _json,

	kv_params_string: _kv_params_string,

	str_equal: _str_equal,
}
