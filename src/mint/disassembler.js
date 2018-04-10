import { sprintf } from '../utils.js'

function parseDSL(specs) {
  const res = {}

  // Parse mini-DSL for instruction specifications, turning each spec into a
  // useful structure to be used for parsing each bytecode instruction.
  for (let k in specs) {
    const [pretty, write, read] = specs[k].split("|").map(s => s.trim())
    const paramPattern = /\b(r[xyz]|(?:\w+:)?[xyzv])\b/g

    // Parse parameters from pretty
    const params = (pretty.match(paramPattern) || []).map(spec => {
      // Handle `type:v` style syntax
      let [type, field] = spec.includes(':')? spec.split(':') : ['imm', spec]
      // Handle r[xyz]
      if (field[0] == 'r') type = 'reg', field = field.slice(1)
      return {type, field}
    })

    // Parse read/write (aka USE and DEF)
    // TODO: make use of type data
    const writeset = write.split(",").map(s => s.split(":")[0]).filter(Boolean),
          readset  = read.split(",").map(s => s.split(":")[0]).filter(Boolean)

    // Format string to use in the prettyprinter
    let i = 0
    const format = pretty.replace(paramPattern, _ =>
        ({ 'imm':       '%02x',   // immediate
           'reg':       'r%02u',  // register
        // 'data':      '0x%08x', // static data (32-bit or string) (TODO: type?)
           'data':      '%s',     // static data (prettyprinted separately)
           'data_s':    '"%s"',   // static data (string) (FIXME: remove)
           'class':     '%s',     // xref: class target
           'method':    '%s',     // xref: method target
           'field':     '%s',     // xref: field target (static or member)
           'reloffset': '%d',     // relative jmp offsets (signed)
         }[params[i++].type]))

    res[k] = {format, params, writeset, readset}
  }

  return res
}

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

const instructionSpecsRTDL = parseDSL({
// op     mnemonic    params              write           read
  0x01: ' mov         rz, true          | z:bool        |                   ',
  0x02: ' mov         rz, false         | z:bool        |                   ',
  0x03: ' ld          rz, data:v        | z:word        |                   ',
  0x04: ' ld          rz, data_s:v      | z:string      |                   ', // FIXME: data_s is temporary since we aren't handling types yet
  0x05: ' mov         rz, rx            | z:~x          | x                 ',
  0x06: ' mov         rz, <res>         | z:~RES        | RES               ',

  // 0e/0f? offset? (0e/0f for methods, 00 for static)
  // TODO: maybe don't read from ARGS here?
  0x07: ' argset      [z] rx            | ARGS          | ARGS,x            ',

  0x09: ' getstatic   rz, field:v       | z:~v          |                   ',
  0x0a: ' getderef    rz, rx            | z:~*x         | x                 ',

  // TODO: figure out if int or uint here?
  0x0b: ' sizeof      rz, class:v       | z:int         |                   ',

  0x0c: ' putderef    rz, rx            |               | z,x               ',
//0x13: ' putfield    rz, field:y, rx   |               | z,x               ',
  0x0d: ' putstatic   field:v, rz       |               | z                 ',

  0x0e: ' addi        rz, rx, ry        | z:~x          | x:u?int,y:u?int   ',
  0x0f: ' subi        rz, rx, ry        | z:~x          | x:u?int,y:u?int   ',
  0x10: ' muls        rz, rx, ry        | z:~x          | x:int,y:int       ',
  0x11: ' divs        rz, rx, ry        | z:~x          | x:int,y:int       ',
  0x12: ' mods        rz, rx, ry        | z:~x          | x:int,y:int       ',
  0x13: ' inci        rz                | z:~z          | z:int             ',
  0x14: ' deci        rz                | z:~z          | z:int             ',
  0x15: ' negi        rz, rx            | z:~x          | x:int             ',

  0x16: ' addf        rz, rx, ry        | z:~x          | x:float,y:float   ',
  0x17: ' subf        rz, rx, ry        | z:~x          | x:float,y:float   ',
  0x18: ' mulf        rz, rx, ry        | z:~x          | x:float,y:float   ',
  0x19: ' divf        rz, rx, ry        | z:~x          | x:float,y:float   ',
  0x1a: ' incf        rz                | z:~z          | z:float           ',
  0x1b: ' decf        rz                | z:~z          | z:float           ',
  0x1c: ' negf        rz, rx            | z:~x          | x                 ',

  0x1d: ' lt int      rz, rx, ry        | z:bool        | x:int,y:int       ',
  0x1e: ' le int      rz, rx, ry        | z:bool        | x:int,y:int       ',
  0x1f: ' eq int      rz, rx, ry        | z:bool        | x:int,y:int       ',
  0x20: ' ne int      rz, rx, ry        | z:bool        | x:int,y:int       ',

  0x21: ' lt float    rz, rx, ry        | z:bool        | x:float,y:float   ',
  0x22: ' le float    rz, rx, ry        | z:bool        | x:float,y:float   ',
  0x23: ' eq float    rz, rx, ry        | z:bool        | x:float,y:float   ',
  0x24: ' ne float    rz, rx, ry        | z:bool        | x:float,y:float   ',
  0x25: ' cmp lt      rz, rx            | z:???         | z:???,x:???       ',
  0x26: ' cmp le      rz, rx            | z:???         | z:???,x:???       ',
  0x27: ' eq bool     rz, rx, ry        | z:bool        | x:bool,y:bool     ',
  0x28: ' ne bool     rz, rx, ry        | z:bool        | x:bool,y:bool     ',

  0x29: ' bitand      rz, rx, ry        | z:int         | x:int,y:int       ',
  0x2a: ' bitor       rz, rx, ry        | z:int         | x:int,y:int       ',
  0x2b: ' bitxor      rz, rx, ry        | z:int         | x:int,y:int       ',
  0x2c: ' bitnot      rz, rx, ry        | z:int         | x:int,y:int       ',
  0x2d: ' not         rz, rx            | z:bool        | x:bool            ',
  0x2e: ' sll         rz, rx, ry        | z:int         | x:int,y:int       ',
  0x2f: ' slr         rz, rx, ry        | z:int         | x:int,y:int       ',

  0x30: ' jmp         reloffset:v       | PC            |                   ',
  0x31: ' jmp if      reloffset:v, rz   | PC            | z:bool            ',
  0x32: ' jmp not     reloffset:v, rz   | PC            | z:bool            ',

  // decl: z local, x = (#args + retreg? + this?)
  0x33: ' decl        z, x              |               |                   ',
  0x34: ' ret                           |               |                   ',
  0x35: ' ret         r0                |               |                   ',
  0x36: ' call        method:v          | RES           | ARGS              ',
  0x37: ' yield       rz                | ???           | z:???             ',

  0x38: ' mcopy       rz, rx, ry        |               | z,x,y:int         ',
  0x39: ' mzero       rz, rx            |               | z,x:int           ',

  0x3a: ' new         rz, class:v       | z:~v          |                   ',
  0x3b: ' newz?       rz, class:v       | z:~v          |                   ',
  0x3c: ' del         rz, class:v       |               |                   ',

  0x3d: ' getfield&   rz, field:v       | z:~&v         | z                 ',

  0x3e: ' mkarray     rz                | z             | z:int             ',
  0x3f: ' getindex&   rz, rx            | z:~&*x        | x                 ',
  0x40: ' arrlength   rz, rx            | z:int         | x                 ',
  0x41: ' delarray    rz                |               | z                 '
})

const instructionSpecsK3D = parseDSL({
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
  0x53: ' getfield&   rz, rx, field:y   | z:~&y         | x                 ',
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
})

export const instructionSpecs = {
  RTDL: instructionSpecsRTDL,
  K3D: instructionSpecsK3D,
}


//-- Disassembler ---------------------------------------------------
export function prettyxref(xref, ent, xbin) {
  if (typeof xref === 'string') {
    return xref;
  }
  // V2 (K3D)
  const target = xbin.by_hash[xref]
  if (target == null) return sprintf("#[%08x]", xref)
  return target.type == 'class'?  target.name
       : (target.parent == ent.parent? "" : target.parent.name + ".") + target.name
}

function readstring(u8, v) {
  const res = []
  for (let i = v; u8[i] != 0 && i < u8.length; i++) {
    if (u8[i] >> 7) {
      // UTF-8
      let check = u8[i] << 1,
          cp    = u8[i],
          bits  = 6
      while ((check >> 7) & 1) {
        cp = cp << 6 | (u8[++i] & 0x3F)
        check <<= 1
        bits += 5
      }
      cp = cp & ((1 << bits) - 1)
      res.push(cp)

    } else {
      // ASCII
      res.push(u8[i])
    }
  }
  return String.fromCharCode(...res)
}

function groupN(arr, n) {
  let res = []
  for (let i = 0; i < arr.length; i += n) {
    res.push(arr.slice(i, i+n))
  }
  return res
}

export function disassemble(method, xbin) {
  const u8 = new Uint8Array(method.bytecode)

  const file  = method.parent.parent,
        xrefs = file.xrefs
  const sdata = file.static_data,
        sdataU8  = new Uint8Array(sdata),
        sdataView = new DataView(sdata)

  const instrs = groupN(u8, 4).map(([op, z, x, y], index) => {
    // Fields (each char a nibble):
    //   oozzxxyy
    //       vvvv
    const v   = xbin.version == 'RTDL'
                  ? x << 8 | y
                  : y << 8 | x,
          vi  = v >= 0x8000? -((v ^ 0xffff) + 1) : v,
          raw = [op,z,x,y]

    // FIXME: ugly hack to be able to load Fighters.  The proper solution
    // would probably involve building an array of instruction specs, and
    // conditionally adding certain instructions depending on `gameId`. (would
    // need to check which opcodes are which instructions in other versions of
    // the engine, too.)
    const gameId = xbin.tree.unk3
    const opIdx = gameId == 5? op                       // K3D
                : gameId == 8? op >= 0x4c? op - 1 : op  // Fighters
                :              op

    const spec = instructionSpecs[xbin.version][opIdx]
    if (spec == null) {
      // unknown instruction
      return {
        op, raw, index,
        mnemonic: '<UNKNOWN>',
        pretty: '<UNKNOWN>',
        spec: null,
        method,
        args: [],
        readset: [],
        writeset: [],
      }
    }

    const mnemonic = spec.format.match(/^(?:[^ ]| [^ ])+/)[0]

    // Fetch concrete argument values (look up in cpool/xrefs etc)
    const args = spec.params.map(({type, field}) => {
                   const value = {x,y,z,v}[field]
                   switch (type) {
                     case 'imm':
                     case 'reg':       return value
                  // case 'data':      return sdataView.getUint32(value, xbin.version != 'RTDL')
                     case 'data':      return [sdataView.getUint32(value, xbin.version != 'RTDL'),
                                               sdataView.getFloat32(value, xbin.version != 'RTDL')]
                     case 'data_s':    return readstring(sdataU8, value)
                     case 'class':
                     case 'method':
                     case 'field':     return xrefs[value]
                     case 'reloffset': return field == 'v'? vi : value
                     default:          return '<?UNIMPLEMENTED?>'
                   }
                 })

    // Register sets (DEF/USE)
    const readset  = spec.readset.map(r => 'xyz'.includes(r)? 'r' + {x,y,z}[r] : r),
          writeset = spec.writeset.map(r => 'xyz'.includes(r)? 'r' + {x,y,z}[r] : r)

    const prettydata = ([int, float]) => sprintf('0x%08x (%f)', int, float)
    // Prettyprint instruction
    const pretty = sprintf(
      spec.format,
      ...args.map((v,i) =>
          ['class','method','field'].includes(spec.params[i].type)? prettyxref(v,method,xbin)
        : spec.params[i].type == 'data'?                            prettydata(v)
        :                                                           v),
    )

    // Resulting parsed instruction
    return {
      op, raw, index,
      mnemonic, pretty,
      spec, method,
      args,
      readset, writeset,
    }
  })

  return instrs
}

//-- Flowgraph stuff ------------------------------------------------
// Construct flowgraph out of the given list of instructions
function construct_cfg(instrs) {
  let pred = instrs.map(_ => ({})),
      succ = instrs.map(_ => ({}))
  // Add flow edge from instr `i` to instr `j` (indices)
  const addEdge = (i,j) => { succ[i][j] = true; pred[j][i] = true }

  for (let instr of instrs) {
    const i = instr.index,
          v = instr.args[0]
    switch (instr.mnemonic) {
      case 'ret':     /* end of function */                 break
      case 'jmp':     addEdge(i, i + v);                    break
      case 'jmp if':  addEdge(i, i + v), addEdge(i, i + 1); break
      case 'jmp not': addEdge(i, i + v), addEdge(i, i + 1); break
      default:                           addEdge(i, i + 1); break
    }
  }

  // Use sorted arrays for in- and out-sets
  const cmp = (a,b) => a - b
  pred = pred.map(o => Object.keys(o).map(Number).sort(cmp))
  succ = succ.map(o => Object.keys(o).map(Number).sort(cmp))

  return {pred, succ}
}

// Construct basic blocks out of flowgraph-annotated instructions
function construct_blocks(instrs) {
  let blocks = [], start = 0, indexMap = {}

  function pushBlock(end) {
    const i = blocks.length
    if (start != end) {
      const block = { index: i, instrs: instrs.slice(start, end) }
      for (let instr of block.instrs) indexMap[instr.index] = i
      blocks.push(block)
    }
    start = end
  }

  // Split into blocks
  for (let {index,pred,succ} of instrs) {
    if (pred.length > 1) pushBlock(index)
    if (!(succ.length == 1 && succ[0] == index + 1)) pushBlock(index + 1)
  }
  pushBlock(instrs.length)

  // Remap CFG from instructions to blocks
  for (let block of blocks) {
    const end = block.instrs.length - 1
    block.pred = block.instrs[  0].pred.map(i => indexMap[i])
    block.succ = block.instrs[end].succ.map(i => indexMap[i])
  }

  return blocks
}

// Liveness analysis
function analyse_liveness(instrs_, cfg) {
  const instrs = instrs_.slice()
  let ins  = instrs.map(_ => ({})),
      outs = instrs.map(_ => ({}))

  // FIXME: Proper iteration order
    for (let instr of instrs.reverse()) {
      const i = instr.index

      // out[i] = \union_{s ∈ succ(i)} in[s]
      for (let s of cfg.succ[i]) {
        for (let r in ins[s]) outs[i][r] = true
      }

      // in[i] = use[i] ∪ (out[i] - def[i])
      let subset = {}
      for (let r in outs[i]) subset[r] = true
      for (let r of instr.writeset) delete subset[r]
      for (let r of instr.readset) ins[i][r] = true
      for (let r in subset) ins[i][r] = true
    }

  return {insets: ins, outsets: outs}
}

export function render_disassembly(instrs_) {
  const classOf = v => v == 0x00? 'zero'
                     : v == 0xFF? 'all'
                     : v  < 0x20? 'low'
                     : v  < 0x7F? 'print'
                     :            'high'

  const cfg = construct_cfg(instrs_)
  const liveness = analyse_liveness(instrs_, cfg)
  const instrs = instrs_.map((instr, i) => Object.assign({
    pred:   cfg.pred[i],
    succ:   cfg.succ[i],
    inset:  liveness.insets[i],
    outset: liveness.outsets[i],
  }, instr))

  const pre = document.createElement('pre')
  pre.classList.add('disasm')

  const printf   = (...args) => pre.appendChild(document.createTextNode(sprintf(...args)))
  const printfAs = (class_, ...args) => {
    const span = document.createElement('span')
    span.classList.add(class_)
    span.appendChild(document.createTextNode(sprintf(...args)))
    pre.appendChild(span)
  }

  const blocks = construct_blocks(instrs)
  let currArrows = [...Array(2)].map(_ => null)

  // Print instructions
  for (let block of blocks) {
    const label = sprintf("BB %d (%s#%s)", block.index,
                      block.pred.length > 0? sprintf("%s → ", block.pred) : "",
                      block.succ.length > 0? sprintf(" → %s", block.succ) : ""),
          arrowPadding = Array(currArrows.length + 1).join("  ")

    printf("%16s%s ", "", arrowPadding)
    printfAs('box', "┌── ")
    printf(label)
    printfAs('box', " %s┐\n", Array(50 - label.length + 1).join("─"))

    for (let instr of block.instrs) {
      const {index, raw, pretty, pred, succ} = instr

      // Address
      printfAs('address', "%4u", index)

      // Raw bytecode
      for (let byte of raw) printfAs(classOf(byte), " %02x", byte)

      // Branch arrows
      const isNextOnly = (arr,d) => arr.length == 1 && arr[0] == index + d
      const marker = !isNextOnly(pred,-1) && succ.length <= 1? "->"
                   : !isNextOnly(succ,+1) && pred.length <= 1? "<-"
                   :                                      "  "
      currArrows[0] = marker
      const arrowString = currArrows.slice().reverse().map(arrow =>
                              arrow == null? "  " : arrow).join("")
      currArrows[0] = null
      printf(" " + arrowString)

      // Pretty-printed instruction
      printfAs('box', "│ ")
      printf(pretty + "\n")
    }

    printfAs('box', "%16s%s └────%s┘\n", "", arrowPadding, Array(50 + 1).join("─"))
  }

  return pre
}

    // FIXME: CFG in- and out-sets
 // pre.appendChild(document.createTextNode(sprintf(' %8s %6s', instr.pred, instr.succ)))

    // FIXME: USE/DEF, IN/OUT
 // pre.appendChild(document.createTextNode(sprintf(' %8s %14s', instr.writeset, instr.readset)))
 // pre.appendChild(document.createTextNode(sprintf(' %24s %24s',
 //     Object.keys(instr.inset).sort(),
 //     Object.keys(instr.outset).sort())))

