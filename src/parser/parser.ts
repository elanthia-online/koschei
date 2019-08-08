import stream   from "stream"
import saxes    from "saxes"
import Tag      from "./tag"
import Pipe     from "../util/pipe"
import * as Str from "../util/string"
import Log      from "../util/log"

type ParserStack =
  | Array<Tag>

export default class Parser extends stream.Writable {
  static MAX_STACK_SIZE = 100

  static of () {
    return new Parser()
  }

  static last_tag (stack: ParserStack) {
    return stack[stack.length-1]
  }

  static broadcast (parser : Parser, tag : Tag) {
    Tag.maybe_merge(tag)
    parser.emit(tag.name, tag)
    return parser.emit("tag", tag)
  }

  static on_open_tag (parser : Parser, stack: ParserStack, {name, attributes} : saxes.SaxesTag) {
    const tag = Tag.of(name, attributes as Record<string, string>, attributes.text as string)
    // if we just opened a new non-child tag
    // we should ensure we clear the stack of
    // any previously opened text tags
    if (stack.length == 1 && Tag.is_root(tag) && Tag.is_text(Parser.last_tag(stack))) {
      Parser.broadcast(parser, stack.pop() as Tag)
    }

    if (Tag.is_inline(tag) && stack.length == 0) {
      stack.push(Tag.of("text", {}))
    }

    stack.push(tag) 

    if (stack.length > Parser.MAX_STACK_SIZE) {
      console.log(new Error("likely memory link or parser error, resetting parser state"))
      stack.length = 0
    }
  }

  static on_text (parser: Parser, stack: ParserStack, text: string) {
    if (stack.length == 0 && text.trim().length == 0) return
    Pipe.of(parser.stack)
      .fmap(Parser.last_tag)
      .fmap(tag => {
        if (tag) {
          Object.assign(tag, { text: tag.text + text })
          if (!(Tag.is_inline(tag) && stack.length == 1)) return            
          stack.pop()
          Parser.broadcast(parser, tag)
          return tag
        }
        const text_tag = Tag.of("text", {} as Record<string, string>, text)
        // self-closing text tag
        if (text.endsWith("\n")) {
          Parser.broadcast(parser, text_tag)
          return text_tag
        }
        stack.push(text_tag)
        return text_tag
      })
  }

  static on_close_tag (parser : Parser, stack : ParserStack, {name, attributes : attrs} : saxes.SaxesTag) {
    name = name.toLowerCase()
    // pop this tag off
    if (Tag.should_fast_forward(name, attrs as Record<string, string>)) { stack.pop() }
    // stay in stream
    if (Tag.is_fake_self_closing(name, attrs as Record<string, string>)) return
    // fetch the closed tag from our
    const tag = stack.pop() as Tag
     // bail because we have a null tag
    if (!tag) return
    // we have pending text that needs to be merged
    if (tag.pending_line && stack.length == 0) {
      const text_tag = Tag.of("text", {} as Record<string, string>, "")
      text_tag.add_child(tag)
      return stack.push(text_tag)
    }
    // we've reached a root tag so broadcast it
    if (stack.length == 0) return Parser.broadcast(parser, tag)
    // merge the child tag onto its parent
    Parser.last_tag(stack).add_child(tag)
 }
  sax    : saxes.SaxesParser;
  stack  : ParserStack;
  constructor () {
    super()
    /**
     * this is the stack of open tags
     */
    this.stack  = []
    /**
     * create our internal Sax parser
     */
    this.sax = new saxes.SaxesParser(
      { fragment: true
      , fileName: "gemstone"
      } as saxes.SaxesOptions)

    this.sax.onopentag = tag => {
      Log.info(":open_tag", tag)
      Parser.on_open_tag(this, this.stack, tag)
    }
    this.sax.ontext = text => {
      Log.info(":text", text)
      Parser.on_text(this, this.stack, text)
    }
    this.sax.onclosetag = tag => {
      Log.info(":close_tag", tag)
      Parser.on_close_tag(this, this.stack, tag)
    }
    this.sax.onerror = err => {
      Log.err(err)
    }
  }

  parse (data : string | Buffer) {
    Pipe.of(data)
      .fmap(data => data.toString())
      .tap(xml => this.handle_xml(xml))
  }

  _write (chunk : string | Buffer, _enc : any, cb : Function | undefined) {
    this.handle_xml(chunk.toString())
    if (typeof cb == "function") cb()
  }

  handle_xml (xml : string) {
    this.emit("xml", xml)
    
    if (this.stack.length == 0 && xml.endsWith("\r\n") && !xml.includes("<")) {
      return this.sax.ontext(xml)
    }
    
    this.sax.write(xml)
    // flush any dangling text, this happens
    // when Lich asynchronously writes text midstream
    if (this.stack.length == 0 || this.stack[0].name == "text") this.sax.write(null)
  }
}