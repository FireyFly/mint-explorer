//-- Mini-DSL for instructions --------------------------------------

// Types
// ---------
// bool         ┐
// int          │
// uint         ├ primitive types
// float        │
// string       ┘
// <enum>       loaded like integer, but is a separate class
// <object>     class type
// ---------
// u?int        int/uint combo. maybe also <enum>
// word         int/uint/<enum>/float. any 32-bit value stored in the
//              static data area
// ~x,~y,~z     type of register <x/y/z>
// ~v           type of field/class <v>
// ~&expr       ref ~expr
// ~*expr       (deref) ~expr

// TODO wrt types:
// * Do integer arithmetic instructions work with both int and uint?
// * When are <enum>s akin to integers?  only for ld purposes, or otherwise
//   too?  can you perform arithmetic on <enum>s?

var instructionSpecs = {
// op     mnemonic    params              write           read
  0x01: ' mov         rz, true          | z:bool        |                   ',
  0x02: ' mov         rz, false         | z:bool        |                   ',
  0x03: ' ld          rz, data:v        | z:word        |                   ',
  0x04: ' ld          rz, data_s:v      | z:string      |                   ', // FIXME: data_s is temporary since we aren't handling types yet
  0x05: ' mov         rz, rx            | z:~x          | x                 ',
  0x06: ' mov         rz, <res>         | z:~RES        | RES               ',

  // 0e/0f? offset? (0e/0f for methods, 00 for static)
  // TODO: maybe don't read from ARGS here?
  0x07: ' args1       [z] rx            | ARGS          | ARGS,x            ',
  0x08: ' args2       [z] rx, ry        | ARGS          | ARGS,x,y          ',
  0x09: ' args3       rz, rx, ry        | ARGS          | ARGS,z,x,y        ',

  0x0a: ' args??      [z x]             | ARGS          | ARGS              ',

  0x0c: ' getstatic   rz, field:v       | z:~v          |                   ',
  0x0d: ' getderef    rz, rx            | z:~*x         | x                 ',
  0x0e: ' getfield    rz, rx, field:y   | z:~&y         | x                 ',

  // TODO: figure out if int or uint here?
  0x0f: ' sizeof      rz, class:v       | z:uint        |                   ',

  0x12: ' putderef    rz, rx            |               | z,x               ',
  0x13: ' putfield    rz, field:y, rx   |               | z,x               ',
  0x14: ' putstatic   field:v, rz       |               | z                 ',

  0x15: ' addi        rz, rx, ry        | z:~x          | x:u?int,y:u?int   ',
  0x16: ' subi        rz, rx, ry        | z:~x          | x:u?int,y:u?int   ',
  0x17: ' muli        rz, rx, ry        | z:~x          | x:u?int,y:u?int   ',
  0x18: ' divi        rz, rx, ry        | z:~x          | x:u?int,y:u?int   ',
  0x19: ' modi        rz, rx, ry        | z:~x          | x:u?int,y:u?int   ',

  0x1d: ' inci        rz                | z:~z          | z:u?int           ',

  0x1f: ' negi        rz, rx            | z:~x          | x:u?int           ',

  0x20: ' addf        rz, rx, ry        | z:~x          | x:float,y:float   ',
  0x21: ' subf        rz, rx, ry        | z:~x          | x:float,y:float   ',
  0x22: ' mulf        rz, rx, ry        | z:~x          | x:float,y:float   ',
  0x23: ' divf        rz, rx, ry        | z:~x          | x:float,y:float   ',

  0x26: ' negf?       rz, rx            | z:~x          | x                 ',

  0x27: ' lt int      rz, rx, ry        | z:bool        | x:int,y:int       ',
  0x28: ' ?? uint?    rz, rx, ry        | z:bool        | x:uint,y:uint     ',
  0x29: ' lt uint     rz, rx, ry        | z:bool        | x:uint,y:uint     ',

  0x2b: ' eq int      rz, rx, ry        | z:bool        | x:int,y:int       ',
  0x2c: ' ?? int      rz, rx, ry        | z:bool        | x:int,y:int       ',
  0x2d: ' lt float    rz, rx, ry        | z:bool        | x:float,y:float   ',
  0x2e: ' ?? float    rz, rx, ry        | z:bool        | x:float,y:float   ',

  0x33: ' eq bool     rz, rx, ry        | z:bool        | x:bool,y:bool     ',

  // 3b zz xx ff: found with arrays, passed <index> and <array length>
  // TODO: int or uint? does this actually write to rz? no clue.
  0x3b: ' capindex?   rz, rx            | z:int         | z:int,x:uint      ',

  0x3d: ' bitor       rz, rx, ry        | z:uint        | x:uint,y:uint     ',

  0x40: ' not         rz, rx            | z:bool        | x:bool            ',

  0x43: ' jmp         reloffset:v       | PC            |                   ',
  0x44: ' jmp if      reloffset:v, rz   | PC            | z:bool            ',
  0x45: ' jmp not     reloffset:v, rz   | PC            | z:bool            ',

  // decl: z local, x param, y regoffset (lowest register used for temporaries)
  0x46: ' decl        z, x, y           |               |                   ',
  0x47: ' ret                           |               |                   ',
  0x48: ' ret         ry                |               | y                 ',
  0x49: ' call local  method:v          | RES           | ARGS              ',
  0x4a: ' call ???    method:v          | RES           | ARGS              ',
  0x4b: ' call ext    method:v          | RES           | ARGS              ',
  0x4c: ' jmp reg?    rz                | PC            | z:int             ',
  // TODO: enforce z ~ x type constraint
  0x4d: ' copy?       rz, rx, ry        |               | z,x,y:uint        ',

  0x4f: ' new         rz, class:v       | z:~v          |                   ',
  0x50: ' new&        rz, class:v       | z:~&v         |                   ',
  // TODO: is 0x51 even useful? should I have one primitive and one object-type register per regno?
  0x51: ' del?        rz, class:v       |               |                   ',

  // 0x53: related to `const ref`
  // 53 ?? xx yy: access field yy of xx (object-type field)
  0x53: ' getfield&   rz, rx, field:y   | z:~&v         | x                 ',
  0x54: ' mkarray     rz                | z             | z:uint            ',
  0x55: ' getindex&   rz, rx            | z:~&*x        | x                 ',
  0x56: ' delarray    rz, rx            |               | z,x:uint          ',

  // TODO: I forget how this instruction works
  0x59: ' getindex&   rz, rx, ry        | z             | x,y               ',

  0x5b: ' f2i         rz, rx            | z:int         | x:float           ',
  0x5c: ' u2e?        rz, rx            | z             | x:uint            ',
  0x5d: ' i2u?        rz, rx            | z:uint        | x:int             ',
  0x5e: ' f2u         rz, rx            | z:uint        | x:float           ',
  0x5f: ' i2f         rz, rx            | z:float       | x:int             ',
  0x60: ' u2f         rz, rx            | z:float       | x:uint            ',

  // References a class with unk1 $0001
  0x61: ' <<61>>      rz, class:v       | z             |                   ',
  0x63: ' <<63>>      rz, data:v        | z             |                   ',
}

// Parse mini-DSL for instruction specifications, turning each spec into a
// useful structure to be used for parsing each bytecode instruction.
for (var k in instructionSpecs) {
  var [pretty, write, read] = instructionSpecs[k].split("|").map(s => s.trim())

  // Parse pretty (TODO: rewrite, make prettier)
  var params = []
  pretty = pretty.replace(/\b(r[xyz]|(?:\w+:)?[xyzv])\b/g, function (spec) {
    var field = spec,
        type  = 'imm'
    // Handle `type:v` style syntax
    if (spec.indexOf(':') >= 0) [type,field] = spec.split(':')
    // Handle r[xyz]
    if (field[0] == 'r') type = 'reg', field = field.slice(1)

    params.push({ type:type, field:field })

    return { 'imm':       '%02x',   // immediate
             'reg':       'r%02u',  // register
             'data':      '0x%08x', // static data (32-bit or string) (TODO: type?)
             'data_s':    '"%s"',   // static data (string) (FIXME: remove)
             'class':     '%s',     // xref: class target
             'method':    '%s',     // xref: method target
             'field':     '%s',     // xref: field target (static or member)
             'reloffset': '%d',     // relative jmp offsets (signed)
           }[type]
  })

  // Parse read/write (aka USE and DEF)
  // TODO: make use of type data
  const writeset = write.split(",").map(s => s.split(":")[0]).filter(Boolean),
        readset  = read.split(",").map(s => s.split(":")[0]).filter(Boolean)

  instructionSpecs[k] = { format:   pretty,
                          params:   params,
                          writeset: writeset,
                          readset:  readset }
}


//-- Disassembler ---------------------------------------------------
function prettyxref(xref, ent, xbin) {
  var target = xbin.by_hash[xref]
  if (target == null) return sprintf("#[%08x]", xref)
  return target.type == 'class'?  target.name
       : (target.parent == ent.parent? "" : target.parent.name + ".") + target.name
}

function disassemble(method, xbin) {
  var u8 = new Uint8Array(method.bytecode)

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

  var instrs = []
  for (var i = 0; i < u8.length; i += 4) {
    // Fields (each char a nibble):
    //   oozzxxyy
    //       vvvv
    var op = u8[i]
    var z  = u8[i+1], x = u8[i+2], y = u8[i+3]
    var v  = u8[i+3] << 8 | u8[i+2],
        vi = v >= 0x8000? -((v ^ 0xffff) + 1) : v

    // FIXME: ugly hack to be able to load Fighters.  The proper solution
    // would probably involve building an array of instruction specs, and
    // conditionally adding certain instructions depending on `gameId`. (would
    // need to check which opcodes are which instructions in other versions of
    // the engine, too.)
    var gameId = xbin.tree.unk3
    var opIdx = gameId == 5? op                       // K3D
              : gameId == 8? op >= 0x4c? op - 1 : op  // Fighters
              :              op

    var spec = instructionSpecs[op]

    // Fetch concrete argument values (look up in cpool/xrefs etc)
    var args = spec.params.map(({type, field}) => {
                 var value = {x,y,z,v}[field]
                 switch (type) {
                   case 'imm':
                   case 'reg':       return value
                   case 'data':      return sd_u32[value/4]
                   case 'data_s':    return readstring(value)
                   case 'class':
                   case 'method':
                   case 'field':     return xrefs[value]
                   case 'reloffset': return field == 'v'? vi : value
                   default:          return '<?UNIMPLEMENTED?>'
                 }
               })

    // read and written registers
    let readset  = spec.readset.map(r => 'xyz'.includes(r)? 'r' + {x,y,z}[r] : r),
        writeset = spec.writeset.map(r => 'xyz'.includes(r)? 'r' + {x,y,z}[r] : r)

    // Resulting parsed instruction
    instrs.push({
      op,
      raw:      [op,z,x,y],
      mnemonic: spec.format.match(/^(?:[^ ]| [^ ])+/)[0],
      index:    i/4,
      method,
      spec,
      args,
      readset,  // Aka USE
      writeset, // Aka DEF
      pretty:   sprintf.apply(null, [spec.format].concat(args.map((v,i) =>
                    ['class','method','field'].includes(spec.params[i].type)?
                       prettyxref(v,method,xbin) : v)))
    })
  }

  return instrs
}

//-- Flowgraph stuff ------------------------------------------------
/*
function shallowcopy(o) {
  var res = Object.create(o.__proto__)
  Object.getOwnPropertyNames(o).forEach(p =>
      Object.defineProperty(res, p, Object.getOwnPropertyDescriptor(o, p)))
  return res
}
*/

// Construct flowgraph out of the given list of instructions
function construct_cfg(instrs) {
  var ins  = instrs.map(_ => ({})),
      outs = instrs.map(_ => ({}))
  // Add flow edge from instr `i` to instr `j` (indices)
  function addEdge(i, j) {
    outs[i][j] = true
    ins[j][i] = true
  }

  for (let instr of instrs) {
    const i = instr.index,
          j = i + instr.args[0]
    switch (instr.mnemonic) {
      case 'ret':     /* end of function */             break
      case 'jmp':     addEdge(i, j);                    break
      case 'jmp if':  addEdge(i, j), addEdge(i, i + 1); break
      case 'jmp not': addEdge(i, j), addEdge(i, i + 1); break
      default:                       addEdge(i, i + 1); break
    }
  }

  // Use sorted arrays for in- and out-sets
  ins  = ins.map(o => Object.keys(o).map(Number).sort())
  outs = outs.map(o => Object.keys(o).map(Number).sort())

  return {ins, outs}
}

// Liveness analysis
function analyse_liveness(instrs_, cfg) {
  const instrs = instrs_.slice()
  var ins  = instrs.map(_ => ({})),
      outs = instrs.map(_ => ({}))

  // FIXME: Proper iteration order

  let hasChanged = true
  while (hasChanged) {
    hasChanged = false

    for (let instr of instrs.reverse()) {
      const i = instr.index
      let size

      // out[i] = \union_{s ∈ succ(i)} in[s]
      size = Object.keys(cfg.outs[i]).length
      for (let s of cfg.outs[i]) {
        for (let r in ins[s]) outs[i][r] = true
      }
      if (Object.keys(cfg.outs[i]).length != size) hasChanged = true

      // in[i] = use[i] ∪ (out[i] - def[i])
      size = Object.keys(cfg.ins[i]).length
      let subset = {}
      for (let r in outs[i]) subset[r] = true
      for (let r of instr.writeset) delete subset[r]
      for (let r of instr.readset) ins[i][r] = true
      for (let r in subset) ins[i][r] = true
      if (Object.keys(cfg.ins[i]).length != size) hasChanged = true
    }
  }

  return {ins, outs}
}

// TODO: this should be broken into several parts and renamed
function render_disassembly(instrs_) {
  function classOf(v) {
    return v == 0x00? 'zero'
         : v == 0xFF? 'all'
         : v  < 0x20? 'low'
         : v  < 0x7F? 'print'
         :            'high'
  }

  let cfg = construct_cfg(instrs_)
  let liveness = analyse_liveness(instrs_, cfg)
  let instrs = instrs_.map((instr, i) => Object.assign({
    cfg:      { ins: cfg.ins[i],      outs: cfg.outs[i]      },
    liveness: { ins: liveness.ins[i], outs: liveness.outs[i] },
  }, instr))

  const pre = document.createElement('pre')
  pre.classList.add('disasm')

  for (let instr of instrs) {
    const i = instr.index

    // Address
    var span = document.createElement('span')
    span.classList.add('address')
    span.appendChild(document.createTextNode(sprintf('%4u ', i)))
    pre.appendChild(span)

    // Bytecode
    for (let byte of instr.raw) {
      var span = document.createElement('span')
      span.classList.add(classOf(byte))
      span.appendChild(document.createTextNode(sprintf(' %02x', byte)))
      pre.appendChild(span)
    }

    // FIXME: CFG in- and out-sets
    pre.appendChild(document.createTextNode(sprintf(' %8s %6s', instr.cfg.ins, instr.cfg.outs)))

    // FIXME: USE/DEF, IN/OUT
    pre.appendChild(document.createTextNode(sprintf(' %8s %14s', instr.writeset, instr.readset)))
    pre.appendChild(document.createTextNode(sprintf(' %24s %24s',
        Object.keys(instr.liveness.ins).sort(),
        Object.keys(instr.liveness.outs).sort())))

    // Human-readable part
    pre.appendChild(document.createTextNode("  ; " + instr.pretty + "\n"))
  }

  return pre
}

//-- Disasm renderer ------------------------------------------------
// TODO: rename to render_disassembly
function render_disassembly_plain(instrs) {
  var pre = document.createElement('pre')
  pre.classList.add('disasm')

  function classOf(v) {
    return v == 0x00? 'zero'
         : v == 0xFF? 'all'
         : v  < 0x20? 'low'
         : v  < 0x7F? 'print'
         :            'high'
  }

  instrs.forEach(ins => {
    // Address
    var span = document.createElement('span')
    span.classList.add('address')
    span.appendChild(document.createTextNode(sprintf('%4u ', ins.index)))
    pre.appendChild(span)

    // Bytecode
    function appendByte(v) {
      var span = document.createElement('span')
      span.classList.add(classOf(v))
      span.appendChild(document.createTextNode(sprintf(' %02x', v)))
      pre.appendChild(span)
    }
    ins.raw.forEach(appendByte)

    // Human-readable part
    pre.appendChild(document.createTextNode("  ; " + ins.pretty + "\n"))
  })

  return pre
}
