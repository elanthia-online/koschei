import Bridge, {LichOptions} from "./bridge"
import Tag from "./parser/tag"

export const connect = 
  (opts : LichOptions) => Bridge.of(opts)

export {Bridge, Tag}