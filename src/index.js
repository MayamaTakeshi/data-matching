var _ = require('lodash')
var sm = require('string-matching')
var util = require('util')

const re_string_matching_indication = /(^|[^!])!{/

var _null = (x, dict, throw_matching_errors, path) => {
	if(x) {
		if(throw_matching_errors) throw new Error(`${path}: expected to be null`)
		return false
	}
	return true
}

var _non_zero = (x, dict, throw_matching_errors, path) => {
	if(typeof x != 'number') {
		if(throw_matching_errors) throw new Error(`${path}: expected to be a number`)
		return false
	}

	if(x == 0) {
		if(throw_matching_errors) throw new Error(`${path}: expected to be non_zero`)
		return false
	}
	return true
}

var _non_blank_str = (x, dict, throw_matching_errors, path) => {
	if(typeof x != 'string') {
		if(throw_matching_errors) throw new Error(`${path}: expected to be a string`)
		return false
	}

	if(x == '') {
		if(throw_matching_errors) throw new Error(`${path}: expected to be non_blank_str`)
		return false
	}
	return true
}

var _str_equal = (s) => {
	return (x, dict, throw_matching_errors, path) => {
		if( x.toString() !== s.toString() ) {
			if(throw_matching_errors) throw new Error(`${path}: expected to str_equal ${s} but got ${x}`)
			return false
		}
		return true
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

var _match_arrays = (expected, received, dict, full_match, throw_matching_errors, path) => {
	var err
	print_debug(`${path}: checking`)

	if(full_match) {
		if(expected.length != received.length) {
			err = `${path}: Array lengths don't match`
			if(throw_matching_errors) throw new Error(err);
			print_debug(err)
			return false
		}
	}
	for(var i=0 ; i<expected.length ; i++) {
		if(!_match(expected[i], received[i], dict, full_match, throw_matching_errors, path + '[' + i + ']')) {
			return false
		}	
	}
	print_debug(`${path}: check OK`)
	return true;
}

var print_debug = (s) => {
		console.error(s) // this actually is not an error. It is just to avoid messing with STDOUT from client code.
}

var _match_dicts = (expected, received, dict, full_match, throw_matching_errors, path) => {
	var err
	print_debug(`${path}: checking`)

	var keys_e = new Set(Object.keys(expected))
	var keys_r = new Set(Object.keys(received))

	for(var key of keys_e) {
		print_debug(`${path}.${key}: checking`)
		var val_e = expected[key]
		if(val_e == absent) {
			if(keys_r.has(key)) {
				err = `${path}.${key}: should be absent`
				if(throw_matching_errors) throw new Error(err)
				print_debug(err)
				return false
			} else {
				print_debug(`${path}.${key}: absent as expected`)
			}
		} else {
			if(!keys_r.has(key)) {
				err = `${path}.${key}: should be present`
				if(throw_matching_errors) throw new Error(err)
				print_debug(err)
				return false
			}
			if(!_match(expected[key], received[key], dict, full_match, throw_matching_errors, path + "." + key)) {
				err = `${path}.${key}: no match`
				print_debug(err)
				return false
			}
		}

		print_debug(`${path}.${key}: check OK`)
		keys_r.delete(key)
	}

	if(full_match) {
		if(keys_r.size > 0) {
			err = `${path}: full match failed due extra keys ${Array.from(keys_r)}`
			if(throw_matching_errors) throw new Error(err)
			print_debug(err)
			return false
		}
	}
	print_debug(`${path}: check OK`)
	return true
}

var _match = (expected, received, dict, full_match, throw_matching_errors, path) => {
	var err

	var type_e = _typeof(expected)
	var type_r = _typeof(received)

	if(type_e == 'undefined') {
		// this means to ignore received value
		print_debug(`${path}: required to be ignored`)
		return true
	}

	if(type_e == type_r) {
		if(type_e == 'array') {
			return _match_arrays(expected, received, dict, full_match, throw_matching_errors, path)
		} else if(type_e == 'dict') {
			return _match_dicts(expected, received, dict, full_match, throw_matching_errors, path)
		}
		if(expected != received) {
			err = `${path}: no match between expected='${expected}' and received='${received}'`
			if(throw_matching_errors) throw new Error(err)
			print_debug(err)
			return false
		}

		print_debug(`${path}: check OK`)
		return true
	}

	if(type_e == 'function') {
		var x
		try {
			var x = expected(received, dict, throw_matching_errors, path)
			print_debug(`${path}: check ${x ? 'OK' : 'failed'}`) 
			return x
		} catch(e) {
			print_debug(`${path}: check failed with ${e}`)
			throw e	
		}
	}

	print_debug(`${path}: check failed`)
	return false
}

var collect = (var_name) => {
	return (val, dict, throw_matching_errors, path) => {
		if(typeof dict[var_name] == 'undefined') {
			dict[var_name] = val
			print_debug(`${path}: collect OK`)
			return true
		} else {
			if(dict[var_name] != val) {
				var err = `${path}: cannot set '${var_name}' to '${util.inspect(val)}' because it is already set to ${util.inspect(dict[var_name])}`
				if(throw_maching_errors) throw new Error(err)
				print_debug(err)
				return false
			}
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

var _matchify_strings = (evt) => {
	return _deepMap(evt, (x) => {
		if(typeof x == 'string' && x.match(re_string_matching_indication)) {
			return sm.gen_matcher(x)
		} else {
			return x
		}
	})
}

var partial_match = (expected) => {
	var expected2 = _matchify_strings(expected)
	var f =  (received, dict, throw_matching_errors, path) => {
		return _match(expected2, received, dict, false, throw_matching_errors, path)
	}
	f.__original_data__ = expected
	f.__name__ = 'partial_match'
	return f
}

var full_match = (expected) => {
	var expected2 = _matchify_strings(expected)
	var f = (received, dict, throw_matching_errors, path) => {
		return _match(expected2, received, dict, true, throw_matching_errors, path);
	}
	f.__original_data__ = expected
	f.__name__ = 'full_match'
	return f
}

var _json = (expected, full_match) => {
	var expected2 = _matchify_strings(expected)
	var f = (s, dict, throw_matching_errors, path) => {
		var received = JSON.parse(s);
		return _match(expected2, received, dict, full_match, throw_matching_errors, path);
	}
	f.__original_data__ = expected
	f.__name__ = 'json' + (full_match ? '_full_match' : '_partial_match')
	return f
}

var json_partial_match = (expected) => {
	return _json(expected, false);
}

var json_full_match = (expected) => {
	return _json(expected, true);
}

var _kv_str = (expected, param_sep, kv_sep, preparse_decoder, postparse_decoder, full_match) => {
	var expected2 = _matchify_strings(expected)
	var f = (s, dict, throw_matching_errors, path) => {
		var received = s;
		if(preparse_decoder) {
			received = preparse_decoder(s);
		}
		received = _
			.chain(received)
			.split(param_sep)
			.map((s) => {
				var parts = s.split(kv_sep);
				var key = parts[0];
				var val =  parts.slice(1).join(kv_sep)
				if(postparse_decoder) {
					val = postparse_decoder(val);
				}
				return [key, val];
			})
			.fromPairs()
			.value();
		return _match(expected2, received, dict, full_match, throw_matching_errors, path);
	}
	f.__original_data__ = expected
	f.__name__ = 'kv_str' + (full_match ? '_full_match' : '_partial_match')
	return f
}

var kv_str_partial_match = (expected, param_sep, kv_sep, preparse_decoder, postparse_decoder) => {
	return _kv_str(expected, param_sep, kv_sep, preparse_decoder, postparse_decoder, false);
}

var kv_str_full_match = (expected, param_sep, kv_sep, preparse_decoder, postparse_decoder) => {
	return _kv_str(expected, param_sep, kv_sep, preparse_decoder, postparse_decoder, true);
}

module.exports = {
	pm: partial_match,
	fm: full_match,
	json: json_partial_match,
	kv_str: kv_str_partial_match,

	partial_match: partial_match,
	full_match: full_match,

	json_partial_match: json_partial_match,
	json_full_match: json_full_match,

	kv_str_partial_match: kv_str_partial_match,
	kv_str_full_match: kv_str_full_match,

	collect: collect,
	absent: absent,
	null: _null,
	non_zero: _non_zero,
	non_blank_str: _non_blank_str,

	str_equal: _str_equal,
}
