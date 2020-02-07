const dm = require('../src/index');
const MatchingError = dm.MatchingError;

const THROW_MATCHING_ERROR = true

const catch_ME = (f) => {
	try {
		f();
	} catch (e) {
		if(! e instanceof MatchingError) {
			throw "should have thrown MatchingError"
		}
		return e
	}
	throw "Shold have thrown a MatchingError"
}

test('partial_match: arrays matched', () => {
	var expected = [1,2,3,4,[5,6,7]];
	var received = [1,2,3,4,[5,6,7]];

	var dict = {}
	var res = dm.partial_match(expected)(received, dict)

	expect(res).toEqual("array matched")
})

test('partial_match: arrays matched (irrelevant elements declared with undefined)', () => {
	var expected = [undefined,2,undefined,4,[5,undefined,7]];
	var received = [1,2,3,4,[5,6,7]];

	var dict = {}
	var res = dm.partial_match(expected)(received, dict)

	expect(res).toEqual("array matched")
})

test('partial_match: arrays matched (irrelevant elements declared with dm._)', () => {
	var expected = [dm._,2,dm._,4,[5,dm._,7]];
	var received = [1,2,3,4,[5,6,7]];

	var dict = {}
	var res = dm.partial_match(expected)(received, dict)

	expect(res).toEqual("array matched")
})

test('partial_match: arrays differ in length', () => {
	var expected = [1,2,3,4,[5,6,7]];
	var received = [1,2,3,4,[5,6,7,8]];

	var dict = {}
	var res = dm.partial_match(expected)(received, dict)
	expect(res).toEqual("array matched")
})

test('full_match: arrays differ in length', () => {
	var expected = [1,2,3,4,[5,6,7]];
	var received = [1,2,3,4,[5,6,7,8]];

	var dict = {}
	var res = dm.full_match(expected)(received, dict, !THROW_MATCHING_ERROR, "root")
	expect(res).toEqual(false)
})

test('full_match: arrays differ in length (throw matching error)', () => {
	var expected = [1,2,3,4,[5,6,7]];
	var received = [1,2,3,4,[5,6,7,8]];

	var dict = {}
	err = catch_ME(() => dm.full_match(expected)(received, dict, THROW_MATCHING_ERROR, "root") )

	expect(err.reason).toEqual("arrays lengths do not match: expected_len=3 received_len=4")
	expect(err.path).toEqual("root[4]")
})

test('full_match', () => {
	var expected = {
		connection: { ip: '192.168.88.74' },
		media: [
			{
				type: 'application',
				port: 9,
				protocol: 'TCP/MRCPv2',
				payloads: ["0"],
				setup: 'active',
				connection: dm._,
				resource: 'speechsynth'
			},
			{
				type: 'audio',
				port: 14238,
				protocol: 'RTP/AVP',
				payloads: ["0", "8", "96"],
			}
			]
	}

	var received = {
		media: [
			{
				type: 'application',
				port: 9,
				protocol: 'TCP/MRCPv2',
				payloads: ["0"],
				setup: 'active',
				connection: 'new',
				resource: 'speechsynth'
			},
			{
				type: 'audio',
				port: 14238,
				protocol: 'RTP/AVP',
				payloads: ["0", "8", "96"],
			}
		],
		connection: { ip: '192.168.88.74' }
	}

	var dict = {}
	var res = dm.full_match(expected)(received, dict, !THROW_MATCHING_ERROR, "root")
	expect(res).toEqual("object matched")
})


test("partial_match: no array match", () => {
	var expected = [1,2,3,4,[5,6,7]];
	var received = [1,2,3,4,[5,6,77]];

	var dict = {}
	var res = dm.partial_match(expected)(received, dict, !THROW_MATCHING_ERROR, "root")
	expect(res).toEqual(false)
})

test("partial_match: no array match (throw matching error)", () => {
	var expected = [1,2,3,4,[5,6,7]];
	var received = [1,2,3,4,[5,6,77]];

	var dict = {}

	err = catch_ME( () => dm.full_match(expected)(received, dict, THROW_MATCHING_ERROR, "root") )

	expect(err.reason).toEqual("expected='7' received='77'")
	expect(err.path).toEqual("root[4][2]")
})

test('partial_match: dicts matched', () => {
	var expected = {
		a: 1,
		b: 2,
		c: ['zero',1,true,undefined],
	}
	var received = {
		a: 1,
		b: 2,
		c: ['zero',1,true,undefined],
		d: 'something extra',
	}
	
	var dict = {}
	var res = dm.partial_match(expected)(received, dict, THROW_MATCHING_ERROR, "root")

	expect(res).toEqual("object matched")
})

test('partial_match: absent', () => {
	var expected = {
		a: dm.absent,
		b: {
			AA: 1,
			BB: 2,
		},
		c: ['zero', 1, true, (x) => { return x == 'three' }],
	}
	var received = {
		b: 2,
		b: {
			AA: 1,
			BB: 2,
		},
		c: ['zero', 1, true, 'three'],
	}

	var dict = {}
	var res = dm.partial_match(expected)(received, dict)
	expect(res).toEqual("object matched")
})

test('partial_match: not absent', () => {
	var expected = {
		a: dm.absent,
		b: 2,
		c: 3,
	}
	var received = {
		a: 1,
		b: 2,
		c: 3,
	}

	var dict = {}
	var res = dm.partial_match(expected)(received, dict, !THROW_MATCHING_ERROR, "root")
	expect(res).toEqual(false)
})

test('partial_match: not absent (throw matching error)', () => {
	var expected = {
		a: dm.absent,
		b: 2,
		c: 3,
	}
	var received = {
		a: 1,
		b: 2,
		c: 3,
	}

	var dict = {}

	err = catch_ME(() => dm.full_match(expected)(received, dict, THROW_MATCHING_ERROR, "root") )

	expect(err.reason).toEqual("should be absent")
	expect(err.path).toEqual("root.a")
})


test('is_str_equal', () => {
	var expected = {
		a: dm.is_str_equal(1),
		b: dm.is_str_equal('2'),
		c: dm.is_str_equal('3'),
	}
	var received = {
		a: 1,
		b: 2,
		c: '3',
	}

	var dict = {}
	var res = dm.partial_match(expected)(received, dict, THROW_MATCHING_ERROR, "root")
	expect(res).toEqual("object matched")
})

test('any_of: first matcher', () => {
	var matcher = dm.any_of([
		dm.full_match({
			a: 1,
			b: 2,
			c: dm.collect('c'),
		}),
		dm.partial_match({
			aa: 10,
			bb: 20,
			cc: dm.collect('cc'),
		}),
	])

	var dict = {}
	expect(
		matcher({
			a: 1,
			b: 2,
			c: 3,
		},
		dict,
		THROW_MATCHING_ERROR,
		"root")
	).toBeTruthy()
	expect(dict.c).toBe(3)
})

test('any_of: second matcher', () => {
	var matcher = dm.any_of([
		dm.full_match({
			a: 1,
			b: 2,
			c: dm.collect('c'),
		}),
		dm.partial_match({
			aa: 10,
			bb: 20,
			cc: dm.collect('cc'),
		}),
	])

	var dict = {}
	expect(
		matcher({
			aa: 10,
			bb: 20,
			cc: 30,
		},
		dict,
		THROW_MATCHING_ERROR,
		"root")
	).toBeTruthy()
	expect(dict.cc).toBe(30)
})

test('any_of: no match', () => {
	var matcher = dm.any_of([
		dm.full_match({
			a: 1,
			b: 2,
			c: dm.collect('c'),
		}),
		dm.partial_match({
			aa: 10,
			bb: 20,
			cc: dm.collect('cc'),
		}),
	])

	var dict = {}

	expect(
		matcher({
			aaa: 100,
			bbb: 200,
			ccc: 300,
		},
		dict,
		!THROW_MATCHING_ERROR,
		"root")
	).toBeFalsy()
})

test('any_of: no taint from previous matcher (dict)', () => {
	var matcher = dm.any_of([
		dm.full_match({
			a: 1,
			b: dm.collect('b'),
			c: 3,
		}),
		dm.partial_match({
			aa: 10,
			bb: 20,
			cc: dm.collect('cc'),
		}),
	])


	var dict = {}
	expect(
		matcher({
			a: 1,
			b: 2,
			c: 300000, // will cause match failure for the first matcher
			aa: 10,
			bb: 20,
			cc: 30,
		},
		dict,
		!THROW_MATCHING_ERROR,
		"root")
	).toBeTruthy()
	expect(dict.a).toBe(undefined)
	expect(dict.b).toBe(undefined)
	expect(dict.c).toBe(undefined)
	expect(dict.aa).toBe(undefined)
	expect(dict.bb).toBe(undefined)
	expect(dict.cc).toBe(30)
})

test('any_of: no taint from previous matcher (array)', () => {
	var matcher = dm.any_of([
		dm.full_match([1, dm.collect('b'), 3]),
		dm.partial_match([1, 2, dm.collect('cc')]),
	])


	var dict = {}
	expect(
		matcher([1, 2, 30],
		dict,
		!THROW_MATCHING_ERROR,
		"root")
	).toBeTruthy()
	expect(dict.b).toBe(undefined)
	expect(dict.cc).toBe(30)
})

test('unordered_list (dict elements): normal order', () => {
	var matcher = dm.unordered_list([
		dm.full_match({a: 1, b: dm.collect('b'), c: 3}),
		dm.partial_match({aa: 10, bb: 20, cc: dm.collect('cc')}),
	])

	var dict = {}
	expect(
		matcher([
			{a: 1, b: 2, c: 3},
			{aa: 10, bb: 20, cc: 30},
		],
		dict,
		THROW_MATCHING_ERROR,
		"root")
	).toBeTruthy()
	expect(dict.b).toBe(2)
	expect(dict.cc).toBe(30)
})

test('unordered_list (dict elements): reverse order', () => {
	var matcher = dm.unordered_list([
		dm.full_match({a: 1, b: dm.collect('b'), c: 3}),
		dm.partial_match({aa: 10, bb: 20, cc: dm.collect('cc')}),
	])

	var dict = {}
	expect(
		matcher([
			{aa: 10, bb: 20, cc: 30},
			{a: 1, b: 2, c: 3},
		],
		dict,
		THROW_MATCHING_ERROR,
		"root")
	).toBeTruthy()
	expect(dict.b).toBe(2)
	expect(dict.cc).toBe(30)
})

test('unordered_list (dict elements): plain dicts', () => {
	var matcher = dm.unordered_list([
		{a: 1, b: dm.collect('b'), c: 3},
		{aa: 10, bb: 20, cc: dm.collect('cc')},
	])

	var dict = {}
	expect(
		matcher([
			{aa: 10, bb: 20, cc: 30},
			{a: 1, b: 2, c: 3},
		],
		dict,
		THROW_MATCHING_ERROR,
		"root")
	).toBeTruthy()
	expect(dict.b).toBe(2)
	expect(dict.cc).toBe(30)
})

test('unordered_list (dict elements): matcher function and plain dict', () => {
	var matcher = dm.unordered_list([
		dm.partial_match({a: 1, b: dm.collect('b'), c: 3}),
		{aa: 10, bb: 20, cc: dm.collect('cc')},
	])

	var dict = {}
	expect(
		matcher([
			{aa: 10, bb: 20, cc: 30},
			{a: 1, b: 2, c: 3},
		],
		dict,
		THROW_MATCHING_ERROR,
		"root")
	).toBeTruthy()
	expect(dict.b).toBe(2)
	expect(dict.cc).toBe(30)
})


test('unordered_list (array elements): normal order', () => {
	var matcher = dm.unordered_list([
		dm.full_match([1, dm.collect('b'), 3]),
		dm.partial_match([10, 20, dm.collect('cc')]),
	])

	var dict = {}
	expect(
		matcher([
			[1, 2, 3],
			[10, 20, 30],
		],
		dict,
		THROW_MATCHING_ERROR,
		"root")
	).toBeTruthy()
	expect(dict.b).toBe(2)
	expect(dict.cc).toBe(30)
})

test('unordered_list (array_elements): plain arrays', () => {
	var matcher = dm.unordered_list([
		[1, dm.collect('b'), 3],
		[10, 20, dm.collect('cc')]
	])

	var dict = {}
	expect(
		matcher([
			[10, 20, 30],
			[1, 2, 3],
		],
		dict,
		THROW_MATCHING_ERROR,
		"root")
	).toBeTruthy()
	expect(dict.b).toBe(2)
	expect(dict.cc).toBe(30)
})

test('unordered_list (array_elements): matcher function and plain array', () => {
	var matcher = dm.unordered_list([
		[1, dm.collect('b'), 3],
		dm.partial_match([10, 20, dm.collect('cc')]),
	])

	var dict = {}
	expect(
		matcher([
			[10, 20, 30],
			[1, 2, 3],
		],
		dict,
		THROW_MATCHING_ERROR,
		"root")
	).toBeTruthy()
	expect(dict.b).toBe(2)
	expect(dict.cc).toBe(30)
})

test('unordered_list: irrelevant elements declared with undefined', () => {
	var matcher = dm.unordered_list([
		[1, dm.collect('b'), undefined],
		dm.partial_match([undefined, undefined, dm.collect('cc')]),
	])

	var dict = {}
	expect(
		matcher([
			[10, 20, 30],
			[1, 2, 3],
		],
		dict,
		THROW_MATCHING_ERROR,
		"root")
	).toBeTruthy()
	expect(dict.b).toBe(2)
	expect(dict.cc).toBe(30)
})

