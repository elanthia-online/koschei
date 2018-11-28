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

        const text_tag = Tag.of("text", {} as Record<string, string>, text)
        // self-closing text tag
        if (text.endsWith("\r\n")) return Parser.broadcast(parser, text_tag)

        stack.push(text_tag)
      })
  }

  static on_close_tag (parser : Parser, stack : ParserStack, {name, attributes} : saxes.SaxesTag) {
    // stay in stream
    if (name.toLowerCase().match(/^push/)) return
    // immediately fast-forward past pop tags so we process the root tag
    if (name.toLocaleLowerCase().match(/^pop/)) stack.pop()
    // pop style flushes
    if (name == "style" && Str.is_empty(attributes.id.toString())) stack.pop()
    // do not pop pseudo opens for style tags
    if (name == "style" && Str.is_not_empty(attributes.id.toString())) return 
    // fetch the closed tag from our
    const tag = stack.pop() as Tag
    if (!tag) return // bail
    if (tag.pending_line && stack.length == 0) {
      const text_tag = Tag.of("text", {} as Record<string, string>, "")
      text_tag.add_child(tag)
      return stack.push(text_tag)
    }
    
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
    this.sax    = new saxes.SaxesParser(
      { fragment: true
      , fileName: "gemstone"
      } as saxes.SaxesOptions)

    this.sax.onopentag = 
      tag => bridge.log(["tag:open", tag]) && Parser.push_stack(this, this.stack, tag)
    this.sax.ontext = 
      text => bridge.log(["text", text]) && Parser.on_text(this, this.stack, text)
    this.sax.onclosetag = 
      tag => bridge.log(["tag:close", tag]) && Parser.on_close_tag(this, this.stack, tag)
    this.sax.onerror =
      (err : Error) => bridge.log({err: err.message, stack: err.stack})

    this.socket.on("data", (data : BufferSource) => Pipe.of(data)
      .fmap(data => data.toString())
      .tap(xml => this.handle_xml(xml)))
  }

  handle_xml (xml : string) {
    this.bridge.emit("xml", xml)
    
    if (this.stack.length == 0 && xml.endsWith("\r\n") && !xml.includes("<")) {
      return this.sax.ontext(xml)
    }
    
    this.sax.write(xml)
  }
}