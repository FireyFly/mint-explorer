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

export function hexdump(buf, offset = 0) {
  const u8 = new Uint8Array(buf)
  const pre = document.createElement('pre')
  pre.classList.add('hexdump')

  const classOf = v => v == 0x00? 'zero'
                     : v == 0xFF? 'all'
                     : v  < 0x20? 'low'
                     : v  < 0x7F? 'print'
                     :            'high'

  const printf   = (...args) => pre.appendChild(document.createTextNode(sprintf(...args)))
  const printfAs = (class_, ...args) => {
    const span = document.createElement('span')
    span.classList.add(class_)
    span.appendChild(document.createTextNode(sprintf(...args)))
    pre.appendChild(span)
  }

  for (let i = 0; i < u8.length; i += 0x10) {
    // Address
    printfAs('address', '%08x', offset + i)

    // Hex part
    for (let j = 0; j < 0x10; j++) {
      if (j % 8 == 0) printf(' ')
      if (i + j < u8.length) {
        printfAs(classOf(u8[i + j]), ' %02x', u8[i + j])
      } else {
        printf('   ')
      }
    }
    printf(' ')

    // Char part
    for (var j = 0; j < 0x10; j++) {
      if (j % 8 == 0) printf(' ')
      if (i + j < u8.length) {
        const ch = 0x20 <= u8[i+j] && u8[i+j] < 0x7F? String.fromCharCode(u8[i+j]) : '.'
        printfAs(classOf(u8[i + j]), '%s', ch)
      } else {
        printf(' ')
      }
    }

    printf('\n')
  }

  return pre
}

//-- Simple timing
let start
export function tick() {
  start = Date.now()
}

export function tock(msg) {
  const delta = Date.now() - start
  const seconds = Math.floor(delta / 1000),
        thousands = delta % 1000
  console.log(sprintf("%4d.%03d %s", seconds, thousands, msg || "Tock"))
  tick()
}

/** fetch-like API for FileReader */
export function asyncRead(blob) {
  const reader = new FileReader()

  function wrapMethod(method) {
    return () => new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(reader.error)
      reader[method](blob)
    })
  }

  return Promise.resolve({
    arrayBuffer:  wrapMethod('readAsArrayBuffer'),
    binaryString: wrapMethod('readAsBinaryString'),
    dataURL:      wrapMethod('readAsDataURL'),
    text:         wrapMethod('readAsText'),
  })
}
