function prettyxref(xref, ent, xbin) {
  var target = xbin.by_hash[xref]
  if (target == null) return sprintf("#[%08x]", xref)
  return target.type == 'class'?  target.name
       : (target.parent == ent.parent? "" : target.parent.name + ".") + target.name
}

function disassemble(method, xbin) {
  var u8 = new Uint8Array(method.bytecode)
  var pre = document.createElement('pre')
  pre.classList.add('disasm')

  var file  = method.parent.parent,
      xrefs = file.xrefs
  var sdata = file.static_data,
      sd_u8  = new Uint8Array(sdata),
      sd_sz  = sdata.byteLength - sdata.byteLength%4,
      sd_u32 = new Uint32Array(sdata.slice(0, sd_sz)),
      sd_f32 = new Float32Array(sdata.slice(0, sd_sz))

  function readstring(v) {
    var res = ""
    for (var i = v; sd_u8[i] != 0 && i < sd_u8.length; i++) {
      if (sd_u8[i] >> 7) {
        console.log(sd_u8.slice(i,i+8))
        // UTF-8
        var check = sd_u8[i] << 1, cp = sd_u8[i], bits = 6
        while ((check >> 7) & 1) {
          cp = cp << 6 | (sd_u8[++i] & 0x3F)
          check <<= 1
          bits += 5
        }
        cp = cp & ((1 << bits) - 1)
        res += String.fromCharCode(cp)

      } else {
        // ASCII
        res += String.fromCharCode(sd_u8[i])
      }
    }
    return res
  }

  function prettyxref_(v) {
    return prettyxref(v, method, xbin)
  }
  function argoffset(v) {
    return v == 0x0e? "."
         : v == 0x0f? "->"
         : sprintf("[%02x]", v)
  }

  function classOf(v) {
    return v == 0x00? 'zero'
         : v == 0xFF? 'all'
         : v  < 0x20? 'low'
         : v  < 0x7F? 'print'
         :            'high'
  }

  for (var i = 0; i < u8.length; i += 4) {
    // Fields (each char a nibble):
    //   oozzxxyy
    //       vvvv
    var op = u8[i]
    var z  = u8[i+1], x = u8[i+2], y = u8[i+3]
    var v  = u8[i+3] << 8 | u8[i+2],
        vi = v >= 0x8000? -((v ^ 0xffff) + 1) : v

    var gameId = xbin.tree.unk3
    var opIdx = gameId == 5? op                       // K3D
              : gameId == 8? op >= 0x4c? op - 1 : op  // Fighters
              :              op

    var human = ""
    switch (opIdx) {
      case 0x01: /* 01 */ human = sprintf("; mov        r%02u, true", z); break;
      case 0x02: /* 02 */ human = sprintf("; mov        r%02u, false", z); break;
      case 0x03: /* 03 */
        var vvu = sd_u32[v/4], vvf = sd_f32[v/4]
        if ((vvu >> 24) < 0x10) human = sprintf("; ld         r%02u, %d (0x%08x)", z, vvu, vvu);
        else                    human = sprintf("; ld         r%02u, %f (0x%08x)", z, vvf, vvu); break;
      case 0x04: /* 04 */ human = sprintf("; ld str     r%02u, \"%s\"", z, readstring(v), v); break;
      case 0x05: /* 05 */ human = sprintf("; mov        r%02u, r%02u", z, x); break;
      case 0x06: /* 06 */ human = sprintf("; mov        r%02u, <res>", z); break;

      case 0x07: /* 07 */ human = sprintf("; args1      %s r%02u", argoffset(z), x); break;
      case 0x08: /* 08 */ human = sprintf("; args2      %s r%02u, r%02u", argoffset(z), x, y); break;  // 0e/0f? offset? (0e/0f for methods, 00 for static)
      case 0x09: /* 09 */ human = sprintf("; args3      r%02u, r%02u, r%02u", z, x, y); break;

      case 0x0a: /* 10 */ human = sprintf("; args??     [%02x %02x]", z, x); break;

      case 0x0c: /* 12 */ human = sprintf("; getstatic  r%02u, %s", z, prettyxref_(xrefs[v])); break;
      case 0x0d: /* 13 */ human = sprintf("; getderef   r%02u, r%02u", z, x); break;
      case 0x0e: /* 14 */ human = sprintf("; getfield   r%02u, r%02u, %s", z, x, prettyxref_(xrefs[y])); break;

      case 0x0f: /* 15 */ human = sprintf("; sizeof     r%02u, %s", z, prettyxref_(xrefs[v])); break;
      // 0x0f: related to `ref`

      case 0x12: /* 18 */ human = sprintf("; putderef   r%02u, r%02u", z, x); break;
      case 0x13: /* 19 */ human = sprintf("; putfield   r%02u, %s, r%02u", z, prettyxref_(xrefs[y]), x); break;
      case 0x14: /* 20 */ human = sprintf("; putstatic  %s, r%02u", prettyxref_(xrefs[v]), z); break;

      case 0x15: /* 21 */ human = sprintf("; add int    r%02u, r%02u, r%02u", z, x, y); break;
      case 0x16: /* 22 */ human = sprintf("; sub int    r%02u, r%02u, r%02u", z, x, y); break;
      case 0x17: /* 23 */ human = sprintf("; mul int    r%02u, r%02u, r%02u", z, x, y); break;
      case 0x18: /* 24 */ human = sprintf("; div int    r%02u, r%02u, r%02u", z, x, y); break;
      case 0x19: /* 25 */ human = sprintf("; mod int    r%02u, r%02u, r%02u", z, x, y); break;

      case 0x1d: /* 29 */ human = sprintf("; inc int    r%02u", z); break;

      case 0x1f: /* 31 */ human = sprintf("; neg int    r%02u, r%02u", z, x); break;

      case 0x20: /* 32 */ human = sprintf("; add float  r%02u, r%02u, r%02u", z, x, y); break;
      case 0x21: /* 33 */ human = sprintf("; sub float  r%02u, r%02u, r%02u", z, x, y); break;
      case 0x22: /* 34 */ human = sprintf("; mul float  r%02u, r%02u, r%02u", z, x, y); break;
      case 0x23: /* 35 */ human = sprintf("; div float  r%02u, r%02u, r%02u", z, x, y); break;

      case 0x26: /* 38 */ human = sprintf("; neg float? r%02u, r%02u", z, x); break;

      case 0x27: /* 39 */ human = sprintf("; lt int     r%02u, r%02u, r%02u", z, x, y); break;
      case 0x28: /* 40 */ human = sprintf("; ?? uint?   r%02u, r%02u, r%02u", z, x, y); break;
      case 0x29: /* 41 */ human = sprintf("; lt uint    r%02u, r%02u, r%02u", z, x, y); break;

      case 0x2b: /* 43 */ human = sprintf("; eq int     r%02u, r%02u, r%02u", z, x, y); break;
      case 0x2c: /* 44 */ human = sprintf("; ?? int     r%02u, r%02u, r%02u", z, x, y); break;
      case 0x2d: /* 45 */ human = sprintf("; lt float   r%02u, r%02u, r%02u", z, x, y); break;
      case 0x2e: /* 46 */ human = sprintf("; ?? float   r%02u, r%02u, r%02u", z, x, y); break;

      case 0x33: /* 51 */ human = sprintf("; eq bool    r%02u, r%02u, r%02u", z, x, y); break;

      // 3b zz xx ff: found with arrays, passed <index> and <array length>
      case 0x3b: /* 59 */ human = sprintf("; capindex?  r%02u, r%02u", z, x); break;

      case 0x3d: /* 61 */ human = sprintf("; bitor      r%02u, r%02u, r%02u", z, x, y); break;

      case 0x40: /* 64 */ human = sprintf("; not        r%02u, r%02u", z, x); break;

      case 0x43: /* 67 */ human = sprintf("; jmp        %d", i/4 + vi); break;
      case 0x44: /* 68 */ human = sprintf("; jmp if     %d, r%02u", i/4 + vi, z); break;
      case 0x45: /* 69 */ human = sprintf("; jmp not    %d, r%02u", i/4 + vi, z); break;

      case 0x46: /* 70 */ human = sprintf("; decl       %u local, %u param, %u specialregs", z, x, y); break;
      case 0x47: /* 71 */ human = sprintf("; ret"); break;
      case 0x48: /* 72 */ human = sprintf("; ret        r00"); break;
      case 0x49: /* 73 */ human = sprintf("; call near  %s", prettyxref_(xrefs[v])); break;
      case 0x4a: /* 74 */ human = sprintf("; call ???   %s", prettyxref_(xrefs[v])); break;
      case 0x4b: /* 75 */ human = sprintf("; call ext   %s", prettyxref_(xrefs[v])); break;
      case 0x4c: /* 76 */ human = sprintf("; jmp reg    r%02u", z); break;
      case 0x4d: /* 77 */ human = sprintf("; copy?      r%02u, r%02u, r%02u", z, x, y); break;

      case 0x4f: /* 79 */ human = sprintf("; new        r%02u, %s", z, prettyxref_(xrefs[v])); break;
      case 0x50: /* 80 */ human = sprintf("; new&       r%02u, %s", z, prettyxref_(xrefs[v])); break;
      case 0x51: /* 81 */ human = sprintf("; del?       r%02u, %s", z, prettyxref_(xrefs[v])); break;

      // 0x53: related to `const ref`
      // 53 ?? xx yy: access field yy of xx (object-type field)
      case 0x53: /* 83 */ human = sprintf("; getfield&  r%02u, r%02u, %s", z, x, prettyxref_(xrefs[y])); break;
      case 0x54: /* 84 */ human = sprintf("; mkarray    r%02u", z); break;
      case 0x55: /* 85 */ human = sprintf("; getindex&  r%02u, r%02u (primitive)", z, x); break;
      case 0x56: /* 86 */ human = sprintf("; delarray   r%02u, r%02u", z, x); break;

      case 0x59: /* 89 */ human = sprintf("; getindex&  r%02u, r%02u, r%02u (object type)", z, x, y); break;

      case 0x5b: /* 91 */ human = sprintf("; float2int  r%02u, r%02u", z, x); break;
      case 0x5c: /* 92 */ human = sprintf("; uint2enum? r%02u, r%02u", z, x); break;
      case 0x5d: /* 93 */ human = sprintf("; int2uint?  r%02u, r%02u", z, x); break;
      case 0x5e: /* 94 */ human = sprintf("; float2uint r%02u, r%02u", z, x); break;
      case 0x5f: /* 95 */ human = sprintf("; int2float  r%02u, r%02u", z, x); break;
      case 0x60: /* 96 */ human = sprintf("; uint2float r%02u, r%02u", z, x); break;

      // References a class with unk1 $0001
      case 0x61: /* 97 */ human = sprintf("; <<61>>     r%02u, %s", z, prettyxref_(xrefs[v])); break;
      case 0x63: /* 99 */ human = sprintf("; <<63>>     r%02u, %08x", z, sd_u32[v/4]); break;
    }

    // Address
    var span = document.createElement('span')
    span.classList.add('address')
    span.appendChild(document.createTextNode(sprintf('%4u', i/4)))
    pre.appendChild(span)

    // Bytecode
    function appendByte(v) {
      var span = document.createElement('span')
      span.classList.add(classOf(v))
      span.appendChild(document.createTextNode(sprintf(' %02x', v)))
      pre.appendChild(span)
    }
    appendByte(op)
    appendByte(z)
    appendByte(x)
    appendByte(y)

    // Human-readable part
    pre.appendChild(document.createTextNode("  " + human + "\n"))
  }

  return pre
}
