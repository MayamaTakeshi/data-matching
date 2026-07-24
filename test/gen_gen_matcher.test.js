const dm = require("../src/index");
const assert = require("assert");

test("xpath-like selector (fast-xml-parser)", () => {
    const { XMLParser } = require("fast-xml-parser");

    var xml = `
<books>
    <book title="Harry Potter" id="1111" code="abc"/>
    <book title="Catch-22" id="2222" code="def"/>
    <book title="The Road" id="3333" code="foo@bar"/>
</books>`;

    var parser = (s) => {
        const xmlParser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "",
        });
        const res = xmlParser.parse(s);
        console.log("res:", JSON.stringify(res));
        return res;
    };

    // Minimal xpath-like extractor supporting queries of the form:
    // /books/book[attr = "value"] or /books/book[attr = value]
    var extractor = (data, key) => {
        console.log("extractor", JSON.stringify(data), key);
        var m = key.match(/^\/books\/book\[(\w+)\s*=\s*"?([^"\]]+)"?\]$/);
        if (!m) {
            return undefined;
        }
        var [, attr, rawValue] = m;
        var books = [].concat(data.books.book);
        var res = books.find((book) => {
            var value = book[attr];
            return value == rawValue;
        });
        console.log("res:", JSON.stringify(res));
        return res;
    };

    var gen_matcher = dm.gen_gen_matcher(parser, extractor, "xpath-like");

    var matcher = gen_matcher({
        '/books/book[title = "Harry Potter"]': {
            id: "1111",
            code: dm.collect("code1"),
        },
        '/books/book[id = 2222]': {
            title: "Catch-22",
            code: dm.collect("code2"),
        },
        '/books/book[id = 3333]': { code: "foo@!{ending}" },
    });

    var dict = {};
    assert(matcher(xml, dict))
    console.log(JSON.stringify(dict))
    assert(dict.code1 == "abc");
    assert(dict.code2 == "def");
    assert(dict.ending == "bar");
});

/*
test('jaycue', () => {
    const jq = require('jaycue')

    var s =`{"books" : [
        {"book": {"title": "Harry Potter", "id": "1111", "code": "abc"}},
        {"book": {"title": "Catch-22", "id": "2222", "code": "def"}},
        {"book": {"title": "The Road", "id": "3333", "code": "ghi"}}
    ]}`

    var parser = JSON.parse
    var extractor = jq

    var gen_matcher = dm.gen_gen_matcher(parser, extractor, 'jaycue')

    var matcher = gen_matcher({
        '.books | select(.title == "Harry Potter")': {id: "1111", code: dm.collect('code1')},
        '.books | select(.id == "2222")': {title: "Catch-22", code: dm.collect('code2')},
        '.books | select(.id == "3333")': {code: 'foo@${ending}'},
    })
    // The above doesn't work yet: jaycue select is buggy.

	var dict = {}
    assert(matcher(s, dict))
    console.log(dict)
    assert(dict.code1 == "abc")
    assert(dict.code2 == "def")
    assert(dict.ending == "bar")
})
*/

/*
test('xml2js-xpath', async () => {
    const xml2js = require("xml2js");
    const xpath = require("xml2js-xpath");

    var xml = `
<books>
    <book title="Harry Potter" id="1111" code="abc"/>
    <book title="Catch-22" id="2222" code="def"/>
    <book title="The Road" id="3333" code="foo@bar"/>
</books>`

    var parser = async (s) => {
        return await xml2js.parseString(s)
    }

    var extractor = xpath.evalFirst

    var gen_matcher = dm.gen_gen_matcher(parser, extractor, 'xml2js-xpath')

    var matcher = gen_matcher({
        '/books/book[title = "Harry Potter"]': {$: {id: "1111", code: dm.collect('code1')}},
        '/books/book[id = "2222"]': {$: {title: "Catch-22", code: dm.collect('code2')}},
        '/books/book[id = "3333"]': {$: {code: 'foo@!{ending}'}},
    })

	var dict = {}
    assert(matcher(xml, dict))
    throw(JSON.stringify(dict))
    assert(dict.code1 == "abc")
    assert(dict.code2 == "def")
    assert(dict.ending == "bar")
})
*/

/*
test('xpath', () => {
    const dom = require('xmldom').DOMParser
    const xpath = require('xpath')

    var xml = `
<books>
    <book title="Harry Potter" id="1111" code="abc"/>
    <book title="Catch-22" id="2222" code="def"/>
    <book title="The Road" id="3333" code="foo@bar"/>
</books>`

    var parser = (s) => { return new dom().parseFromString(s) }
    var extractor = (data, key) => {
        return xpath.select(key, data)
    }

    var gen_matcher = dm.gen_gen_matcher(parser, extractor, 'xpath')

    var matcher = gen_matcher({
        "/books/book[@title='Harry Potter']": [[{id: "1111", code: dm.collect('code1')}]],
        "/books/book[@id='2222']": [[{title: "Catch-22", code: dm.collect('code2')}]],
        "/books/book[@id='3333']": [[{code: 'foo@!{ending}'}]],
    })

	var dict = {}
    assert(matcher(xml, dict))
    assert(dict.code1 == "abc")
    assert(dict.code2 == "def")
    assert(dict.ending == "bar")
})
*/
