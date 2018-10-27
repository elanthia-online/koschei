import net    from "net"
import events from "events"
import Parser from "./parser/parser"

export type LichOptions = {
  port  : number;
  host? : string;
}

export default class Bridge extends events.EventEmitter {
  static of (options : LichOptions) {
    return new Bridge(options)
  }

  socket: net.Socket;
  parser: Parser;
  constructor ({host = "127.0.0.1", port} : LichOptions) {
    super()
    const socket = this.socket = net.createConnection({host, port})
    const parser = this.parser = Parser.of(this, socket)
  }
}