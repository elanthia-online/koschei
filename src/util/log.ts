import debug from "debug"

export default 
  { info : debug("koschei:info")
  , warn : debug("koschei:warn")
  , err  : debug("koschei:err")
  }