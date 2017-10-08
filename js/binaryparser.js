const StandardTypes = { u8:  [ 1,   'Uint8' ],
                        u16: [ 2,  'Uint16' ],
                        u32: [ 4,  'Uint32' ],
                        i8:  [ 1,    'Int8' ],
                        i16: [ 2,   'Int16' ],
                        i32: [ 4,   'Int32' ],
                        f32: [ 4, 'Float32' ],
                        f64: [ 8, 'Float64' ] }

function extractKV(obj) {
  if ('0' in obj && '1' in obj) {
    return [ obj[0], obj[1] ]
  } else {
    for (var key in obj) {
      return [ key, obj[key] ]
    }
  }
  throw new Error("No key-value pair found!")
}

export default class BinaryParser {
  constructor(buf, types) {
    this.buffer  = buf
    this.view    = new DataView(buf)
    this.types   = types || {}
    this.cursor  = 0
    this.flipped = false
  }

  isEOF() {
    return this.cursor >= this.buffer.byteLength
  }

  flipEndianness() {
    this.flipped ^= true
  }

  seek(offset, whence = 'set') {
    switch (whence) {
      case 'set':                 this.cursor = offset; break
      case 'cur': case 'current': this.cursor += offset; break
      case 'end':                 this.cursor = this.buffer.byteLength + offset; break
      default:
        throw new Error("BinaryParser#seek: bad `whence`: " + whence)
    }
    if (this.cursor < 0) this.cursor = 0
  }

  read(type) {
    // buf[123] or buf[*]
    if (type.slice(0,4) == 'buf[') {
      const countS = type.slice(4,-1),
            count  = countS == '*'? this.buffer.byteLength - this.cursor
                   :                Number(countS),
            res    = this.buffer.slice(this.cursor, this.cursor + count)
      this.cursor += count
      return res

    // custom types
    } else if (type in this.types) {
      const [len, res] = this.types[type](this.cursor, this.buffer, this.view),
      this.cursor += len
      return res

    // primitives
    } else if (type in StandardTypes) {
      const [len, name] = StandardTypes[type]
      const res = this.view['get' + name](this.cursor, this.flipped)
      this.cursor += len
      return res

    // structures
    } else if (Array.isArray(type)) {
      const res = {}
      for (let kv of type) {
        const [key, type] = extractKV(kv)
        res[key] = this.read(type)
      }
      return res
    }
  }
}
