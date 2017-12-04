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

var _match_arrays = (expected, received, dict, full_match) => {
	if(full_match) {
		if(expected.length != received.length) throw "Array lengths don't match"
	}
	for(var i=0 ; i<expected.length ; i++) {
		if(!_match(expected[i], received[i], dict, full_match)) {
			return false
		}	
	}
	return true;
}

var _match_dicts = (expected, received, dict, full_match) => {
	var keys_e = new Set(Object.keys(expected))
	var keys_r = new Set(Object.keys(received))

	for(var key of keys_e) {
		console.log("Checking " + key)
		var val_e = expected[key]
		if(val_e == absent) {
			if(keys_r.has(key)) {
				throw "Element " + key + " should be absent"
			} else {
				console.log("OK: " + key + ' is absent')
			}
		} else {
			if(!keys_r.has(key)) throw "Expected element " + key + " not found"
			if(!_match(expected[key], received[key], dict, full_match)) throw "No match for element " + key
		}

		keys_r.delete(key)
	}

	if(full_match) {
		if(keys_r.length > 0) throw "Dict full match failed"
	}
	return true
}

var _match = (expected, received, dict, full_match) => {
	var type_e = _typeof(expected)
	var type_r = _typeof(received)

	if(type_e == 'undefined') {
		// this means to ignore received value
		return true
	}

	if(type_e == type_r) {
		if(type_e == 'array') {
			return _match_arrays(expected, received, dict, full_match)
		} else if(type_e == 'dict') {
			return _match_dicts(expected, received, dict, full_match)
		}
		if(expected != received) throw "Elements expected='" + expected + "' received='" + received + "' don't match"

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
			if(dict[var_name] != val) throw "Cannot set " + var_name + " to " + util.inspect(val) + " because it is already set to " + util.inspect(dict[var_name])
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
	var f =  (received, dict) => {
		return _match(expected2, received, dict, false)
	}
	f.__original_data__ = expected
	f.__name__ = 'partial_match'
	return f
}

var full_match = (expected) => {
	var expected2 = _matchify_strings(expected)
	var f = (received, dict) => {
		return _match(expected2, received, dict, true);
	}
	f.__original_data__ = expected
	f.__name__ = 'full_match'
	return f
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
}
