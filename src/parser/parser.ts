import assert   from "assert"
import events   from "events"
import net      from "net"
import saxes    from "saxes"
import Tag      from "./tag"
import Bridge   from "../bridge"
import Pipe     from "../util/pipe"
import * as Str from "../util/string"

type ParserStack =
  | Array<Tag>

export default class Parser {
  static MAX_STACK_SIZE = 100

  static of (bridge : Bridge, socket : net.Socket) {
    return new Parser(bridge, socket)
  }

  static last_tag (stack: ParserStack) {
    return stack[stack.length-1]
  }

  static broadcast (parser : Parser, tag : Tag) {
    Tag.maybe_merge(tag)
    parser.bridge.emit(tag.name, tag)
    return parser.bridge.emit("tag", tag)
  }

  static push_stack (parser : Parser, stack: ParserStack, {name, attributes} : saxes.SaxesTag) {
    const tag = Tag.of(name, attributes as Record<string, string>, attributes.text as string)

    // if we just opened a new non-child tag
    // we should ensure we clear the stack of
    // any previously opened text tags
    if (stack.length == 1 && Tag.is_root(tag) && Tag.is_text(Parser.last_tag(stack))) {
      Parser.broadcast(parser, stack.pop() as Tag)
    }

    stack.push(tag) 

    if (stack.length > Parser.MAX_STACK_SIZE) {
      console.log(new Error("likely memory link or parser error, resetting parser state"))
      stack.length = 0
    }
  }

  static on_text (parser: Parser, stack: ParserStack, text: string) {
    Pipe.of(parser.stack)
      .fmap(Parser.last_tag)
      .fmap(tag => {
        if (tag) return Object.assign(tag, {text : tag.text + text})

        stack.push(
          Tag.of("text", {} as Record<string, string>, text))
      })
  }

  static on_close_tag (parser : Parser, stack : ParserStack, {name, attributes} : saxes.SaxesTag) {
    // stay in stream
   if (name.toLowerCase().match(/^push/)) return
   // immediately fast-forward past pop tags so we process the root tag
   if (name.toLocaleLowerCase().match(/^pop/)) stack.pop()

   if (name == "style" && Str.is_empty(attributes.id.toString())) stack.pop()

   if (name == "style" && Str.is_not_empty(attributes.id.toString())) return // do not pop pseudo opens for style tags

   const tag = stack.pop() as Tag
   
   if (stack.length == 0) return Parser.broadcast(parser, tag)

   Parser.last_tag(stack).add_child(tag)
 }

  socket : net.Socket;
  sax    : saxes.SaxesParser;
  stack  : ParserStack;
  bridge : Bridge;
  constructor (bridge : Bridge, socket : net.Socket) {
    this.bridge = bridge
    this.socket = socket
    this.stack  = []
    this.sax    = new saxes.SaxesParser({fragment: true, fileName: "game.feed"} as saxes.SaxesOptions)

    this.sax.onopentag = 
      tag => Parser.push_stack(this, this.stack, tag)
    this.sax.ontext = 
      text => Parser.on_text(this, this.stack, text)
    this.sax.onclosetag = 
      tag => Parser.on_close_tag(this, this.stack, tag)

    this.socket.on("data", (data : BufferSource) => Pipe.of(data)
      .fmap(data => data.toString())
      .tap(xml => bridge.emit("xml", xml))
      .fmap(s => this.sax.write(s)))
  }
}