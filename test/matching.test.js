const m = require('../src/index');
const MatchingError = m.MatchingError;

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
	var res = m.partial_match(expected)(received, dict)

	expect(res).toEqual("array matched")
})


test('partial_match: arrays differ in length', () => {
	var expected = [1,2,3,4,[5,6,7]];
	var received = [1,2,3,4,[5,6,7,8]];

	var dict = {}
	var res = m.partial_match(expected)(received, dict)
	expect(res).toEqual("array matched")
})

test('full_match: arrays differ in length', () => {
	var expected = [1,2,3,4,[5,6,7]];
	var received = [1,2,3,4,[5,6,7,8]];

	var dict = {}
	var res = m.full_match(expected)(received, dict, !THROW_MATCHING_ERROR, "root")
	expect(res).toEqual(false)
})

test('full_match: arrays differ in length (throw matching error)', () => {
	var expected = [1,2,3,4,[5,6,7]];
	var received = [1,2,3,4,[5,6,7,8]];

	var dict = {}
	err = catch_ME(() => m.full_match(expected)(received, dict, THROW_MATCHING_ERROR, "root") )

	expect(err.reason).toEqual("arrays lengths do not match: expected_len=3 received_len=4")
	expect(err.path).toEqual("root[4]")
})

test("partial_match: no array match", () => {
	var expected = [1,2,3,4,[5,6,7]];
	var received = [1,2,3,4,[5,6,77]];

	var dict = {}
	var res = m.partial_match(expected)(received, dict, !THROW_MATCHING_ERROR, "root")
	expect(res).toEqual(false)
})

test("partial_match: no array match (throw matching error)", () => {
	var expected = [1,2,3,4,[5,6,7]];
	var received = [1,2,3,4,[5,6,77]];

	var dict = {}

	err = catch_ME( () => m.full_match(expected)(received, dict, THROW_MATCHING_ERROR, "root") )

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
	var res = m.partial_match(expected)(received, dict, THROW_MATCHING_ERROR, "root")

	expect(res).toEqual("object matched")
})

test('partial_match: absent', () => {
	var expected = {
		a: m.absent,
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
	var res = m.partial_match(expected)(received, dict)
	expect(res).toEqual("object matched")
})

test('partial_match: not absent', () => {
	var expected = {
		a: m.absent,
		b: 2,
		c: 3,
	}
	var received = {
		a: 1,
		b: 2,
		c: 3,
	}

	var dict = {}
	var res = m.partial_match(expected)(received, dict, !THROW_MATCHING_ERROR, "root")
	expect(res).toEqual(false)
})

test('partial_match: not absent (throw matching error)', () => {
	var expected = {
		a: m.absent,
		b: 2,
		c: 3,
	}
	var received = {
		a: 1,
		b: 2,
		c: 3,
	}

	var dict = {}

	err = catch_ME(() => m.full_match(expected)(received, dict, THROW_MATCHING_ERROR, "root") )

	expect(err.reason).toEqual("should be absent")
	expect(err.path).toEqual("root.a")
})


test('is_str_equal', () => {
	var expected = {
		a: m.is_str_equal(1),
		b: m.is_str_equal('2'),
		c: m.is_str_equal('3'),
	}
	var received = {
		a: 1,
		b: 2,
		c: '3',
	}

	var dict = {}
	var res = m.partial_match(expected)(received, dict, THROW_MATCHING_ERROR, "root")
	expect(res).toEqual("object matched")
})
