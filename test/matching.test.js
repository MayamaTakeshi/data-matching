const m = require('../src/index');

const THROW_MATCHING_ERRORS = true

test('partial_match: arrays matched', () => {
	var expected = [1,2,3,4,[5,6,7]];
	var received = [1,2,3,4,[5,6,7]];

	var dict = {}
	var res = m.partial_match(expected)(received, dict)

	expect(res).toEqual(true)
})


test('partial_match: arrays differ in length', () => {
	var expected = [1,2,3,4,[5,6,7]];
	var received = [1,2,3,4,[5,6,7,8]];

	var dict = {}
	var res = m.partial_match(expected)(received, dict)
	expect(res).toEqual(true)
})

test('full_match: arrays differ in length', () => {
	var expected = [1,2,3,4,[5,6,7]];
	var received = [1,2,3,4,[5,6,7,8]];

	var dict = {}
	var res = m.full_match(expected, !THROW_MATCHING_ERRORS)(received, dict)
	expect(res).toEqual(false)
})

test('full_match: arrays differ in length (throw matching error)', () => {
	var expected = [1,2,3,4,[5,6,7]];
	var received = [1,2,3,4,[5,6,7,8]];

	var dict = {}
	expect( () => m.full_match(expected)(received, dict, THROW_MATCHING_ERRORS, "") ).toThrow(/Array lengths don't match/)
})

test("partial_match: no array match", () => {
	var expected = [1,2,3,4,[5,6,7]];
	var received = [1,2,3,4,[5,6,77]];

	var dict = {}
	var res = m.partial_match(expected, !THROW_MATCHING_ERRORS)(received, dict)
	expect(res).toEqual(false)
})

test("partial_match: no array match (throw matching error)", () => {
	var expected = [1,2,3,4,[5,6,7]];
	var received = [1,2,3,4,[5,6,77]];

	var dict = {}
	expect( () => m.partial_match(expected)(received, dict, THROW_MATCHING_ERRORS, "") ).toThrow(/no match between expected='7' and received='77'/)
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
	var res = m.partial_match(expected)(received, dict)
	expect(res).toEqual(true)
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
	expect(res).toEqual(true)
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
	var res = m.partial_match(expected)(received, dict, !THROW_MATCHING_ERRORS, "")
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
	expect( () => m.partial_match(expected)(received, dict, THROW_MATCHING_ERRORS, "") ).toThrow(/should be absent/)
})


test('str_equal', () => {
	var expected = {
		a: m.str_equal(1),
		b: m.str_equal('2'),
		c: m.str_equal('3'),
	}
	var received = {
		a: 1,
		b: 2,
		c: '3',
	}

	var dict = {}
	var res = m.partial_match(expected)(received, dict)
	expect(res).toEqual(true)
})
