//-- Helpers --------------------------------------------------------
export function assert(cond, msg) {
  if (!cond) throw new Error(msg || "Assertion failed.")
}

export function sprintf(fmt, ...args) {
  let i = 0
  return fmt.replace(/%(-?)(0?)(\d+|)([sbduxfj]|ip|mac)/g,
                     (_, align, padChar, padN, spec) => {
                       const str = toString(args[i++], spec),
                             pad = Array(Math.max(padN - str.length + 1, 0)).join(padChar || ' ')
                       return align != '-'? pad + str : str + pad
                     })

  function toString(value, spec) {
    const pad2hex = n => (n < 16? '0' : '') + n.toString(16)
    const int = Math.floor(Number(value))
    switch (spec) {
      case 's':   return String(value)
      case 'd':
      case 'u':   return String(int)
      case 'x':   return int.toString(16)
      case 'b':   return int.toString(2)
      case 'f':   return Number(value).toFixed(4)
      case 'j':   return JSON.stringify(value)
      case 'ip':  return [ (value >> 24) & 0xFF,
                           (value >> 16) & 0xFF,
                           (value >>  8) & 0xFF,
                           (value >>  0) & 0xFF ].join(".")
      case 'mac': return [ (value >> 36) & 0xFF,
                           (value >> 32) & 0xFF,
                           (value >> 24) & 0xFF,
                           (value >> 16) & 0xFF,
                           (value >>  8) & 0xFF,
                           (value >>  0) & 0xFF ].map(pad2hex).join(":")
      default:
        throw new Error("sprintf: unimplemented spec: '" + spec + "'.")
    }
  }
}
export function printf(...args) {
  console.log(sprintf(...args))
}
