import Bridge, {LichOptions} from "./bridge"

export const connect = 
  (opts : LichOptions) => Bridge.of(opts)

export {Bridge}