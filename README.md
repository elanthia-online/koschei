# @elanthia/koschei [![Build Status](https://travis-ci.org/elanthia-online/koschei.svg?branch=master)](https://travis-ci.org/elanthia-online/koschei)

Typescript, event-driven, Stream support, perfect for your next integration with Gemstone like building Electron apps, TUIs, or whatever.  Wraps a SAX-based parser with robust error recovery and a stack-driven approach.

Features:

1. handles monsterbold elegantly by reducing arbitrarily nested `<pushBold> > <a>` tags to `<monster>`
2. maps ugly `<pushBold> | </popBold>` tags to `<b> | </b>` like sane people should
3. should handle all of the ugly cases of the XML-like feed for you

Example:

```javascript
import net           from "net"
import {Parser, Tag} from "@elanthia/koschei"
// make our parser instance
const parser = Parser.of()
// open a socket to a Game feed 
// doesn't have to be Lich, but most people are familiar with it
const lich   = net.connect({port: LICH_PORT_OR_WHATEVER})
// on any tag (firehose)
parser.on("tag", console.log)
// all tags are also emitted by name
parser.on("monster", App.redraw)
// tell the parser to parse the incoming tcp packets
lich.pipe(parser)
```

