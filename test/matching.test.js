const m = require('../src/index');

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
	expect( () => m.full_match(expected)(received, dict) ).toThrow(/Array lengths don't match/)
})

test("partial_match: no array match", () => {
	var expected = [1,2,3,4,[5,6,7]];
	var received = [1,2,3,4,[5,6,77]];

	var dict = {}
	expect( () => m.partial_match(expected)(received, dict) ).toThrow(/Elements .+ don't match/)
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
		c: ['zero', 1, true],
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
	expect( () => m.partial_match(expected)(received, dict) ).toThrow(/should be absent/)
})

