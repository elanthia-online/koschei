/**
 * process an array of cli arguments into an Object
 * 
 * example:
 *  node bundler --watch --dirs=lib,plugins
 *  {watch: true, dirs: ["lib", "plugins"]}
 */
const parse_arg_name = name => name.replace(/-{1,2}/g, "")

const throws = ({arg, shape, msg = ""}) => { 
  throw new Error(
    [ ''
    , `Argument[${arg}] is not a valid argument`
    , msg
    , `valid arguments: ${make_opts_list(shape)}`
    ].join("\n\t"))
}

const handle_arg_with_val = (parsed, arg, shape) => {
  const [flag, val] = arg.split("=")
  const arg_name    = parse_arg_name(flag)
  parsed[arg_name]  = cast(val, arg_name, shape)
  return parsed
}

const handle_arg_exists = (parsed, arg, shape) => {
  const arg_name = parse_arg_name(arg)
  parsed[arg_name] = cast(true, arg_name, shape)
  return parsed
}

const make_opts_list = 
  shape => "\n\t\t" + Object.entries(shape)
    .map(([name, kind])=> `--${name}=${kind.name}`)
    .join("\n\t\t")

const cast = (val, name, shape) => {
  const kind = shape[name]
  if (!kind) { throws({arg: name, shape}) }
  
  switch (kind) {
    case String:
      return val.toString()
    case Array:
      return val.split(",")
    case Number:
      val.match(/[0-9]+/) || throws({arg: name, shape, msg: `${name} was not a valid Integer`})
      return parseInt(val, 10)
    case Boolean:
      if (val === "true")  return true
      if (val === "1")     return true
      if (val === true)    return true
      if (val === "false") return false
      if (val === "0")     return false
      throws({arg: name, shape})
    default:
      throws({arg: name, shape})
  }
}

exports.parse = function ({args = process.argv, shape = {}}) {
  args = args.slice(2).reduce(function (parsed, arg) {
    if (~arg.indexOf("=")) return handle_arg_with_val(parsed, arg, shape)
    return handle_arg_exists(parsed, arg, shape)
  }, {})

  Object.keys(shape).forEach(arg => {
    args[arg] || throws({arg, shape, msg: `${arg} was missing`})
  })

  return args
}