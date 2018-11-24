import net    from "net"
import events from "events"
import fs     from "fs"
import util   from "util"
import Parser from "./parser/parser"

export type LichOptions = {
  port  : number;
  host? : string;
  log?  : fs.WriteStream;
}

export default class Bridge extends events.EventEmitter {
  static of (options : LichOptions) {
    return new Bridge(options)
  }

  socket: net.Socket;
  parser: Parser;
  constructor ({host = "127.0.0.1", port, log} : LichOptions) {
    super()
    const socket = this.socket = net.createConnection({host, port})
    const parser = this.parser = Parser.of(this, socket)
    this.on("log", (data : any) => log && log.write(util.inspect(data) + "\n"))
  }

  log (data : any) : true {
    this.emit("log", data)
    return true
  }
}