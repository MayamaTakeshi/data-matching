const dm = require("../src/index");
const MatchingError = dm.MatchingError;

const THROW_MATCHING_ERROR = true;

const catch_ME = (f) => {
    try {
        f();
    } catch (e) {
        if ((!e) instanceof MatchingError) {
            throw "should have thrown MatchingError";
        }
        return e;
    }
    throw "Shold have thrown a MatchingError";
};

test("check null", () => {
    var expected = {
        a: null,
        b: 2,
    };
    var received = {
        a: null,
        b: 2,
    };

    var dict = {};
    var res = dm.full_match(expected)(
        received,
        dict,
        !THROW_MATCHING_ERROR,
        "root",
    );
    expect(res).toEqual("object matched");
});

test("check non_zero", () => {
    var expected = {
        a: 1,
        b: dm.non_zero,
    };
    var received = {
        a: 1,
        b: 2,
    };

    var dict = {};
    var res;

    res = dm.full_match(expected)(
        received,
        dict,
        !THROW_MATCHING_ERROR,
        "root",
    );
    expect(res).toEqual("object matched");

    received.b = 0;
    res = dm.full_match(expected)(
        received,
        dict,
        !THROW_MATCHING_ERROR,
        "root",
    );
    expect(res).toEqual(false);
});

test("check non_blank_str", () => {
    var expected = {
        a: "aaa",
        b: dm.non_blank_str,
    };
    var received = {
        a: "aaa",
        b: "bbb",
    };

    var dict = {};
    var res;

    res = dm.full_match(expected)(
        received,
        dict,
        !THROW_MATCHING_ERROR,
        "root",
    );
    expect(res).toEqual("object matched");

    received.b = "";
    res = dm.full_match(expected)(
        received,
        dict,
        !THROW_MATCHING_ERROR,
        "root",
    );
    expect(res).toEqual(false);
});

test("partial_match: arrays matched", () => {
    var expected = [1, 2, 3, 4, [5, 6, 7]];
    var received = [1, 2, 3, 4, [5, 6, 7]];

    var dict = {};
    var res = dm.partial_match(expected)(received, dict);

    expect(res).toEqual("array matched");
});

test("partial_match: arrays matched (irrelevant elements declared with dm._ (anything))", () => {
    var expected = [dm._, 2, dm._, 4, [5, dm._, 7]];
    var received = [1, 2, 3, 4, [5, 6, 7]];

    var dict = {};
    var res = dm.partial_match(expected)(received, dict);

    expect(res).toEqual("array matched");
});

test("partial_match: arrays differ in length", () => {
    var expected = [1, 2, 3, 4, [5, 6, 7]];
    var received = [1, 2, 3, 4, [5, 6, 7, 8]];

    var dict = {};
    var res = dm.partial_match(expected)(received, dict);
    expect(res).toEqual(false);
});

test("full_match: arrays differ in length", () => {
    var expected = [1, 2, 3, 4, [5, 6, 7]];
    var received = [1, 2, 3, 4, [5, 6, 7, 8]];

    var dict = {};
    var res = dm.full_match(expected)(
        received,
        dict,
        !THROW_MATCHING_ERROR,
        "root",
    );
    expect(res).toEqual(false);
});

test("full_match: arrays differ in length (throw matching error)", () => {
    var expected = [1, 2, 3, 4, [5, 6, 7]];
    var received = [1, 2, 3, 4, [5, 6, 7, 8]];

    var dict = {};
    err = catch_ME(() =>
        dm.full_match(expected)(received, dict, THROW_MATCHING_ERROR, "root"),
    );

    expect(err.reason).toEqual(
        "arrays lengths do not match: expected_len=3 received_len=4",
    );
    expect(err.path).toEqual("root[4]");
});

test("full_match", () => {
    var expected = {
        connection: { ip: "192.168.88.74" },
        media: [
            {
                type: "application",
                port: 9,
                protocol: "TCP/MRCPv2",
                payloads: ["0"],
                setup: "active",
                connection: dm._,
                resource: "speechsynth",
            },
            {
                type: "audio",
                port: 14238,
                protocol: "RTP/AVP",
                payloads: ["0", "8", "96"],
            },
        ],
    };

    var received = {
        media: [
            {
                type: "application",
                port: 9,
                protocol: "TCP/MRCPv2",
                payloads: ["0"],
                setup: "active",
                connection: "new",
                resource: "speechsynth",
            },
            {
                type: "audio",
                port: 14238,
                protocol: "RTP/AVP",
                payloads: ["0", "8", "96"],
            },
        ],
        connection: { ip: "192.168.88.74" },
    };

    var dict = {};
    var res = dm.full_match(expected)(
        received,
        dict,
        !THROW_MATCHING_ERROR,
        "root",
    );
    expect(res).toEqual("object matched");
});

test("partial_match: no array match", () => {
    var expected = [1, 2, 3, 4, [5, 6, 7]];
    var received = [1, 2, 3, 4, [5, 6, 77]];

    var dict = {};
    var res = dm.partial_match(expected)(
        received,
        dict,
        !THROW_MATCHING_ERROR,
        "root",
    );
    expect(res).toEqual(false);
});

test("partial_match: no array match (throw matching error)", () => {
    var expected = [1, 2, 3, 4, [5, 6, 7]];
    var received = [1, 2, 3, 4, [5, 6, 77]];

    var dict = {};

    err = catch_ME(() =>
        dm.full_match(expected)(received, dict, THROW_MATCHING_ERROR, "root"),
    );

    expect(err.reason).toEqual("expected='7' received='77'");
    expect(err.path).toEqual("root[4][2]");
});

test("partial_match: dicts matched", () => {
    var expected = {
        a: 1,
        b: 2,
        c: ["zero", 1, true, dm._],
        d: 'sip:!{user}@!{domain}',
    };
    var received = {
        a: 1,
        b: 2,
        c: ["zero", 1, true, 4],
        d: 'sip:bob@biloxi.com',
        e: "something extra",
    };

    var dict = {};
    var res = dm.partial_match(expected)(
        received,
        dict,
        THROW_MATCHING_ERROR,
        "root",
    );

    expect(res).toEqual("object matched");
    expect(dict.user).toEqual('bob');
    expect(dict.domain).toEqual('biloxi.com');
});

test("partial_match: absent", () => {
    var expected = {
        a: dm.absent,
        b: {
            AA: 1,
            BB: 2,
        },
        c: [
            "zero",
            1,
            true,
            (x) => {
                return x == "three";
            },
        ],
    };
    var received = {
        b: 2,
        b: {
            AA: 1,
            BB: 2,
        },
        c: ["zero", 1, true, "three"],
    };

    var dict = {};
    var res = dm.partial_match(expected)(received, dict);
    expect(res).toEqual("object matched");
});

test("partial_match: not absent", () => {
    var expected = {
        a: dm.absent,
        b: 2,
        c: 3,
    };
    var received = {
        a: 1,
        b: 2,
        c: 3,
    };

    var dict = {};
    var res = dm.partial_match(expected)(
        received,
        dict,
        !THROW_MATCHING_ERROR,
        "root",
    );
    expect(res).toEqual(false);
});

test("partial_match: not absent (throw matching error)", () => {
    var expected = {
        a: dm.absent,
        b: 2,
        c: 3,
    };
    var received = {
        a: 1,
        b: 2,
        c: 3,
    };

    var dict = {};

    err = catch_ME(() =>
        dm.full_match(expected)(received, dict, THROW_MATCHING_ERROR, "root"),
    );

    expect(err.reason).toEqual("should be absent");
    expect(err.path).toEqual("root.a");
});

test("str_equal", () => {
    var expected = {
        a: dm.str_equal(1),
        b: dm.str_equal("2"),
        c: dm.str_equal("3"),
    };
    var received = {
        a: 1,
        b: 2,
        c: "3",
    };

    var dict = {};
    var res = dm.partial_match(expected)(
        received,
        dict,
        THROW_MATCHING_ERROR,
        "root",
    );
    expect(res).toEqual("object matched");
});

test("any_of: first matcher", () => {
    var matcher = dm.any_of([
        dm.full_match({
            a: 1,
            b: 2,
            c: dm.collect("c"),
        }),
        dm.partial_match({
            aa: 10,
            bb: 20,
            cc: dm.collect("cc"),
        }),
    ]);

    var dict = {};
    expect(
        matcher(
            {
                a: 1,
                b: 2,
                c: 3,
            },
            dict,
            THROW_MATCHING_ERROR,
            "root",
        ),
    ).toBeTruthy();
    expect(dict.c).toBe(3);
});

test("any_of: second matcher", () => {
    var matcher = dm.any_of([
        dm.full_match({
            a: 1,
            b: 2,
            c: dm.collect("c"),
        }),
        dm.partial_match({
            aa: 10,
            bb: 20,
            cc: dm.collect("cc"),
        }),
    ]);

    var dict = {};
    expect(
        matcher(
            {
                aa: 10,
                bb: 20,
                cc: 30,
            },
            dict,
            THROW_MATCHING_ERROR,
            "root",
        ),
    ).toBeTruthy();
    expect(dict.cc).toBe(30);
});

test("any_of: collect matches", () => {
    var matcher = dm.full_match({
        type: dm.collect("type"),
        connection: dm.any_of(["new", "existing"], "connection"),
        resource: dm.any_of(["speechsynch", "speechrecog"], "resource"),
    });

    var dict = {};
    expect(
        matcher(
            {
                type: "application",
                connection: "new",
                resource: "speechrecog",
            },
            dict,
            THROW_MATCHING_ERROR,
            "root",
        ),
    ).toBeTruthy();
    expect(dict.type).toBe("application");
    expect(dict.connection).toBe("new");
    expect(dict.resource).toBe("speechrecog");
});

test("any_of: no match", () => {
    var matcher = dm.any_of([
        dm.full_match({
            a: 1,
            b: 2,
            c: dm.collect("c"),
        }),
        dm.partial_match({
            aa: 10,
            bb: 20,
            cc: dm.collect("cc"),
        }),
    ]);

    var dict = {};

    expect(
        matcher(
            {
                aaa: 100,
                bbb: 200,
                ccc: 300,
            },
            dict,
            !THROW_MATCHING_ERROR,
            "root",
        ),
    ).toBeFalsy();
});

test("any_of: no taint from previous matcher (dict)", () => {
    var matcher = dm.any_of([
        dm.full_match({
            a: 1,
            b: dm.collect("b"),
            c: 3,
        }),
        dm.partial_match({
            aa: 10,
            bb: 20,
            cc: dm.collect("cc"),
        }),
    ]);

    var dict = {};
    expect(
        matcher(
            {
                a: 1,
                b: 2,
                c: 300000, // will cause match failure for the first matcher
                aa: 10,
                bb: 20,
                cc: 30,
            },
            dict,
            !THROW_MATCHING_ERROR,
            "root",
        ),
    ).toBeTruthy();
    expect(dict.a).toBe(undefined);
    expect(dict.b).toBe(undefined);
    expect(dict.c).toBe(undefined);
    expect(dict.aa).toBe(undefined);
    expect(dict.bb).toBe(undefined);
    expect(dict.cc).toBe(30);
});

test("any_of: no taint from previous matcher (array)", () => {
    var matcher = dm.any_of([
        dm.full_match([1, dm.collect("b"), 3]),
        dm.partial_match([1, 2, dm.collect("cc")]),
    ]);

    var dict = {};
    expect(
        matcher([1, 2, 30], dict, !THROW_MATCHING_ERROR, "root"),
    ).toBeTruthy();
    expect(dict.b).toBe(undefined);
    expect(dict.cc).toBe(30);
});

test("unordered_list (dict elements): normal order", () => {
    var matcher = dm.unordered_list([
        dm.full_match({ a: 1, b: dm.collect("b"), c: 3 }),
        dm.partial_match({ aa: 10, bb: 20, cc: dm.collect("cc") }),
    ]);

    var dict = {};
    expect(
        matcher(
            [
                { a: 1, b: 2, c: 3 },
                { aa: 10, bb: 20, cc: 30 },
            ],
            dict,
            THROW_MATCHING_ERROR,
            "root",
        ),
    ).toBeTruthy();
    expect(dict.b).toBe(2);
    expect(dict.cc).toBe(30);
});

test("unordered_list (dict elements): reverse order", () => {
    var matcher = dm.unordered_list([
        dm.full_match({ a: 1, b: dm.collect("b"), c: 3 }),
        dm.partial_match({ aa: 10, bb: 20, cc: dm.collect("cc") }),
    ]);

    var dict = {};
    expect(
        matcher(
            [
                { aa: 10, bb: 20, cc: 30 },
                { a: 1, b: 2, c: 3 },
            ],
            dict,
            THROW_MATCHING_ERROR,
            "root",
        ),
    ).toBeTruthy();
    expect(dict.b).toBe(2);
    expect(dict.cc).toBe(30);
});

test("unordered_list (dict elements): plain dicts", () => {
    var matcher = dm.unordered_list([
        { a: 1, b: dm.collect("b"), c: 3 },
        { aa: 10, bb: 20, cc: dm.collect("cc") },
    ]);

    var dict = {};
    expect(
        matcher(
            [
                { aa: 10, bb: 20, cc: 30 },
                { a: 1, b: 2, c: 3 },
            ],
            dict,
            THROW_MATCHING_ERROR,
            "root",
        ),
    ).toBeTruthy();
    expect(dict.b).toBe(2);
    expect(dict.cc).toBe(30);
});

test("unordered_list (dict elements): matcher function and plain dict", () => {
    var matcher = dm.unordered_list([
        dm.partial_match({ a: 1, b: dm.collect("b"), c: 3 }),
        { aa: 10, bb: 20, cc: dm.collect("cc") },
    ]);

    var dict = {};
    expect(
        matcher(
            [
                { aa: 10, bb: 20, cc: 30 },
                { a: 1, b: 2, c: 3 },
            ],
            dict,
            THROW_MATCHING_ERROR,
            "root",
        ),
    ).toBeTruthy();
    expect(dict.b).toBe(2);
    expect(dict.cc).toBe(30);
});

test("unordered_list (array elements): normal order", () => {
    var matcher = dm.unordered_list([
        dm.full_match([1, dm.collect("b"), 3]),
        dm.partial_match([10, 20, dm.collect("cc")]),
    ]);

    var dict = {};
    expect(
        matcher(
            [
                [1, 2, 3],
                [10, 20, 30],
            ],
            dict,
            THROW_MATCHING_ERROR,
            "root",
        ),
    ).toBeTruthy();
    expect(dict.b).toBe(2);
    expect(dict.cc).toBe(30);
});

test("unordered_list (array_elements): plain arrays", () => {
    var matcher = dm.unordered_list([
        [1, dm.collect("b"), 3],
        [10, 20, dm.collect("cc")],
    ]);

    var dict = {};
    expect(
        matcher(
            [
                [10, 20, 30],
                [1, 2, 3],
            ],
            dict,
            THROW_MATCHING_ERROR,
            "root",
        ),
    ).toBeTruthy();
    expect(dict.b).toBe(2);
    expect(dict.cc).toBe(30);
});

test("unordered_list (array_elements): matcher function and plain array", () => {
    var matcher = dm.unordered_list([
        [1, dm.collect("b"), 3],
        dm.partial_match([10, 20, dm.collect("cc")]),
    ]);

    var dict = {};
    expect(
        matcher(
            [
                [10, 20, 30],
                [1, 2, 3],
            ],
            dict,
            THROW_MATCHING_ERROR,
            "root",
        ),
    ).toBeTruthy();
    expect(dict.b).toBe(2);
    expect(dict.cc).toBe(30);
});

test("unordered_list: irrelevant elements declared with dm._ (anything)", () => {
    var matcher = dm.unordered_list([
        [1, dm.collect("b"), dm._],
        dm.partial_match([dm._, dm._, dm.collect("cc")]),
    ]);

    var dict = {};
    expect(
        matcher(
            [
                [10, 20, 30],
                [1, 2, 3],
            ],
            dict,
            THROW_MATCHING_ERROR,
            "root",
        ),
    ).toBeTruthy();
    expect(dict.b).toBe(2);
    expect(dict.cc).toBe(30);
});

test("collect with matcher)", () => {
    var matcher = dm.collect("main", [
        [10, dm.collect("b"), dm._],
        dm.partial_match([dm._, dm._, dm.collect("cc")]),
    ]);

    var received = [
        [10, 20, 30],
        [1, 2, 3],
    ];

    var dict = {};
    expect(matcher(received, dict, !THROW_MATCHING_ERROR, "root")).toBeTruthy();
    expect(dict.b).toBe(20);
    expect(dict.cc).toBe(3);
    expect(dict.main).toBe(received);
});

test("collect function inside obj)", () => {
    const sum = (x,y) => {
        return x+y
    }

    var matcher = dm.partial_match({
        sum: dm.collect("sumfu"),
    })

    var received = {
        sum,
    }

    var dict = {};
    expect(matcher(received, dict, !THROW_MATCHING_ERROR, "root")).toBeTruthy();
    expect(dict.sumfu(1,2)).toBe(3);
});


test("matching function", () => {
    var expected = {
        a: "aaa",
        b: (received, dict) => received.toLowerCase() == "bbb",
    };
    var received = {
        a: "aaa",
        b: "BbB",
    };

    var dict = {};
    var res;

    res = dm.full_match(expected)(
        received,
        dict,
        !THROW_MATCHING_ERROR,
        "root",
    );
    expect(res).toEqual("object matched");
});

test("pop_match with object", () => {
    const item1 = {
        id: 1,
        name: "user1",
    };

    const item2 = {
        id: 2,
        name: "user2",
    };

    const items = [item1, item2];

    const dict = {};

    const item = dm.pop_match(
        {
            name: "user2",
            id: dm.collect("id"),
        },
        items,
        dict,
    );

    expect(item).toEqual(item2);

    expect(dict.id).toEqual(2);

    expect(items).toEqual([item1]);
});

test("pop_match with object and string collection", () => {
    const item1 = {
        id: 1,
        name: "user1",
        surname: "bla-bla",
    };

    const item2 = {
        id: 2,
        name: "user2",
        surname: "ble-ble",
    };

    const items = [item1, item2];

    const dict = {};

    const item = dm.pop_match(
        {
            name: "user!{id}",
            surname: "bla-!{_}",
        },
        items,
        dict,
    );

    expect(item).toEqual(item1);

    expect(dict.id).toEqual("1");

    expect(items).toEqual([item2]);
});

test("pop_match with function", () => {
    const item1 = {
        id: 1,
        name: "user1",
    };

    const item2 = {
        id: 2,
        name: "user2",
    };

    const items = [item1, item2];

    const dict = {};

    const item = dm.pop_match(
        (received, dict) => {
            if (received.name == "user2") return true;
        },
        items,
        dict,
    );

    expect(item).toEqual(item2);

    expect(items).toEqual([item1]);
});

test("reverse_pop_match with object", () => {
    const item1 = {
        id: 1,
        name: "user1",
    };

    const item2 = {
        id: 2,
        name: "user2",
    };

    const items = [item1, item2];

    const dict = {};

    const item = dm.reverse_pop_match(
        {
            name: "user2",
            id: 2,
        },
        items,
        dict,
    );

    expect(item).toEqual(item2);

    expect(items).toEqual([item1]);
});

test("reverse_pop_match with object and string collection", () => {
    const item1 = {
        id: 1,
        name: "user!{id}",
    };

    const item2 = {
        id: 2,
        name: "user!{id}",
    };

    const items = [item1, item2];

    const dict = {};

    const item = dm.reverse_pop_match(
        {
            name: "user2",
            id: 2,
        },
        items,
        dict,
    );

    expect(item).toEqual(item2);

    expect(dict.id).toEqual("2");

    expect(items).toEqual([item1]);
});

test("reverse_pop_match with function", () => {
    const item1 = {
        id: 1,
        name: "user1",
    };

    const item2 = (received, dict) => {
        if (received.name == "user2") return true;
    };

    const items = [item1, item2];

    const dict = {};

    const item = dm.reverse_pop_match(
        {
            id: 2,
            name: "user2",
        },
        items,
        dict,
    );

    expect(item).toEqual(item2);

    expect(items).toEqual([item1]);
});

test("push", () => {
    var expected = {
        id: dm.push('ids'),
    };
    var received = {
        name: 'john',
        id: 10,
    };

    var dict = {};
    var res = dm.partial_match(expected)(
        received,
        dict,
        !THROW_MATCHING_ERROR,
        "root",
    );

    expect(res).toEqual("object matched");

    expect(dict).toEqual({ids: [10]});

    var received2 = {
        name: 'bob',
        id: 20,
    };

    res = dm.partial_match(expected)(
        received2,
        dict,
        !THROW_MATCHING_ERROR,
        "root"
    );

    expect(res).toEqual("object matched");

    expect(dict).toEqual({ids: [10, 20]});
});

test("pop", () => {
    var expected = {
        id: dm.pop('ids'),
    };

    var received = {
        name: 'john',
        id: 20,
    };

    var dict = {}
    expect(() => {
        dm.partial_match(expected)(
            received,
            dict,
            THROW_MATCHING_ERROR,
            "root"
        )
    }).toThrow("'ids' is undefined")

    dict = {ids: 'abc'}
    expect(() => {
        dm.partial_match(expected)(
            received,
            dict,
            THROW_MATCHING_ERROR,
            "root"
        )
    }).toThrow("'ids' is not an Array")

    dict = {ids: [30,20,10]}
    res = dm.partial_match(expected)(
        received,
        dict,
        THROW_MATCHING_ERROR,
        "root"
    )

    expect(res).toEqual("object matched")
    expect(dict).toEqual({ids: [30, 10]})
});

test("xml", () => {
    var expected = [
      {
        "IVR": [
          {
            "Section": [
              {
                "Wait": [],
                ":@": {
                  "length": dm.collect("length")
                }
              },
              {
                "Play": [
                  {
                    "#text": "welcome.mp3"
                  }
                ]
              },
              {
                "SendFax": [
                  {
                    "#text": "faxes/main_office_map.tiff"
                  }
                ],
                ":@": {
                  "header": "Your Invoice"
                }
              }
            ],
            ":@": {
              "name": "main"
            }
          }
        ]
      }
    ];

    var received = `
<IVR>
  <Section name="main">
    <Wait length="1"/>
    <Play>welcome.mp3</Play>
    <SendFax header="Your Invoice">faxes/main_office_map.tiff</SendFax>
  </Section>
</IVR>
`
    var dict = {}

    res = dm.xml(expected)(
        received,
        dict,
        !THROW_MATCHING_ERROR,
        "root"
    );

    expect(res).toEqual("array matched");
    expect(dict).toEqual({length: "1"});
});


