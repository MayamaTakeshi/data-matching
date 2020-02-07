# data-matching
Matches a data object against a match object.

# sample usage

## full match (all specified data must be present):
```
const dm = require("data-matching")
const assert = require('assert')

var received = {
	connection: { ip: '192.168.88.74' },
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
	connection: { ip: '192.168.88.74' },
	media: [
		{
			type: 'application',
			port: 9,
			protocol: 'TCP/MRCPv2',
			payloads: ["0"],
			setup: 'active',
			connection: 'new',
			resource: dm.collect('media_resource')
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
assert(store.media_resource == 'speechsynth')
```


## partial match (only part of the data must match):
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

