//-- Helpers --------------------------------------------------------
function assert(cond, msg) {
  if (!cond) throw new Error(msg || "Assertion failed.")
}

function sprintf(fmt /*...*/) {
  var args = arguments,
      i    = 1

  return fmt.replace(/%(-?)(0?)(\d+|)([sbduxfj]|ip|mac)/g, function (_, align, padChar, padN, spec) {
    var str = toString(args[i++], spec),
        pad = Array(Math.max(padN - str.length + 1, 0)).join(padChar || ' ')
    return align != '-'? pad + str : str + pad
  })

  function toString(value, spec) {
    var int = Math.floor(Number(value))
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

    function pad2hex(n) {
      return (n < 16? '0' : '') + n.toString(16)
    }
  }
}
function printf(/*...*/) {
  console.log(sprintf.apply(null, arguments))
}


//-- Node -----------------------------------------------------------
function Node(props) {
  if (props == null) props = {}
  this.ch = {}
  this.children = []
  for (var k in props) {
    this[k] = props[k]
  }
}
Node.prototype.add = function (name, props) {
  if (!(name in this.ch)) {
    this.ch[name] = new Node(props)
    this.children.push(name)
  }
  return this.ch[name]
}

Node.prototype.addPath = function (path, props) {
  var curr = this
  path.forEach(function (pair) {
    var type = pair[0],
        name = pair[1]
    curr.add(name, { type: type, name: name })
    curr = curr.ch[name]
  })
  for (var k in props) {
    curr[k] = props[k]
  }
}
