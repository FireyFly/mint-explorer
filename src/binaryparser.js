const StandardTypes = {
  u8:  [ 1,   'Uint8' ],
  u16: [ 2,  'Uint16' ],
  u32: [ 4,  'Uint32' ],
  i8:  [ 1,    'Int8' ],
  i16: [ 2,   'Int16' ],
  i32: [ 4,   'Int32' ],
  f32: [ 4, 'Float32' ],
  f64: [ 8, 'Float64' ],
}

/**
 * Extracts a key-value pair from an object.  Two kinds are supported:
 * [key, value]  =>  [ key,  value]
 * {key: value}  =>  ['key', value]
 */
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

/**
 * Utility for reading binary data, presenting a C-style FILE*-like interface.
 * Allows for easy seeking, reading of basic primitive types, and struct-like
 * types.
 */
export default class BinaryParser {
  /**
   * Creates a new BinaryParser wrapping the given ArrayBuffer `buf`.  You can
   * provide custom types via `types`, in addition to the standard primitive
   * types.
   *   Each property in `types` should have its key be the type name and
   * its value be a function taking (offset, ArrayBuffer, DataView) and
   * returning [skip, res] where `skip` is the number of bytes consumed and
   * `res` is the resulting value after parsing the type.
   */
  constructor(buf, types = {}) {
    this.buffer  = buf
    this.view    = new DataView(buf)
    this.types   = types
    this.cursor  = 0
    this.flipped = false
  }

  /** Returns whether we have reached end of input. */
  isEOF() {
    return this.cursor >= this.buffer.byteLength
  }

  /**
   * Flips the endianness.  By default, a BinaryParser is big-endian
   * (inherited from typed arrays/DataView).
   */
  flipEndianness() {
    this.flipped ^= true
  }

  /**
   * Seeks to `offset`, either absolutely (default), relatively (whence =
   * 'cur', or absolutely from the end (whence = 'end').
   */
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

  /**
   * Reads and returns a valu of the given type.  `type` can be:
   * - buf[N]:            read N bytes as an ArrayBuffer,
   * - buf[*]:            read until EOF as an ArrayBuffer,
   * - (primitive):       read and return the value of a standard primitive type,
   * - (custom):          read and return the value of a custom type provided to the
   *                      BinaryParser constructor,
   * - [...{name:type}]:  read a structure type consisting of name-type
   *                      key-vale pairs in the form of objects, returning an
   *                      object with all the `name`s taken as property keys.
   */
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
      const [len, res] = this.types[type](this.cursor, this.buffer, this.view)
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
