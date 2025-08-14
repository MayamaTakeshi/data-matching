# data-matching
Matches a data object against a match object.

# Syntax details
  - Part of strings can be collected using '!{name}' syntax (see https://github.com/MayamaTakeshi/string-matching)
  - data can be collected (stored in a dictionary passed to matching function) by using dm.collect('name')
  - data that should be absent can be declared with dm.absent

# Sample usage

## Full match (all specified data must be present):
```
const dm = require("data-matching")
const assert = require('assert')

var received = {
	connection: { ip: '192.168.2.10' },
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
	]
}

var expected = {
	connection: { ip: dm.collect('remote_ip') },
	media: [
		{
			type: 'application',
			port: 9,
			protocol: '!{transport_protocol}/MRCP!{mrcp_version}',
			payloads: [dm.collect('mrcp_payload')],
			setup: 'active',
			connection: 'new',
			resource: dm.any_of(['speechsynth', 'speechrecog'], 'media_resource')
		},
		{
			type: 'audio',
			port: 14238,
			protocol: 'RTP/AVP',
			payloads: ["0", "8", "96"],
		}
	]
}

var store = {}
assert(dm.full_match(expected)(received, store))
assert(store.remote_ip == "192.168.2.10")
assert(store.mrcp_payload == "0")
assert(store.media_resource == 'speechsynth')
assert(store.mrcp_version == 'v2')
assert(store.transport_protocol == 'TCP')
```


## Partial match (only part of the data must match):
```
const dm = require("data-matching")
const assert = require('assert')


var received = {
	request_uri: 'sip:alice@abc.com',
	from_uri: '<sip:bob@cba.com>',
	to_uri: 'sip:alice@abc.com',
	call_id: 'ee98b779-3048-41cf-b85b-0a05bcc4038a',
	cseq: 'INVITE 50',
}


var expected = {
	request_uri: 'sip:!{user1}@!{domain1}',
	from_uri: '<sip:!{user2}@!{domain2}>',
	cseq: '!{method} 50',
	some_absent_key: dm.absent,
}


var store = {}
assert(dm.partial_match(expected)(received, store))
assert(store.user1 == 'alice')
assert(store.domain1 == 'abc.com')
assert(store.user2 == 'bob')
assert(store.domain2 == 'cba.com')
assert(store.method == 'INVITE')
```
## Using matching functions

Suppose that you need to check if a value string in lower case matches a string.

You can pass a function to perform the match like this:
```
var expected = {
    some_param: value => value.toLowerCase() == "abcdef",
}
```
So the above will match some_param with any value like 'abcdef', 'ABCDEF', 'AbcDef', 'abcDEF' etc.

And if you need to collect the value as it is, you can do:
```
var expected = {
    some_param: dm.collect('some_param', value => value.toLowerCase() == "abcdef"),
}
```


## More examples:

See https://github.com/MayamaTakeshi/data-matching/blob/master/test/matching.test.js

