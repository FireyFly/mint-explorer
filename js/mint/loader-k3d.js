import { assert, sprintf } from '../utils.js'
import BinaryParser from '../binaryparser.js'

function readstr(bp, offset) {
  bp.seek(offset)
  var size = bp.read('u32')
  var res = ""
  for (var i = 0; i < size; i++) res += String.fromCharCode(bp.read('u8'))
  return res
}

//-------------------------------------------------------------------
export function readMintV2(bp) {
  const base = bp.cursor - 0x10

  // Read rest of header
  const unk2 = bp.read('u16')
  assert(unk2 == 1, `expected unk2 == 1, found ${unk2}`)

  var hd = bp.read([ { unk3:          'u16' }, // (game-dependent)
                     { packages_size: 'u32' },
                     { packages_ptr:  'u32' },
                     { files_size:    'u32' },
                     { files_ptr:     'u32' } ])

  // Read package and file tables
  bp.seek(hd.packages_ptr)
  var package_table = []
  for (var i = 0; i < hd.packages_size; i++) {
    package_table.push(bp.read([ { name_ptr:     'u32' }, // ptr to string (length-prefixed & null-terminated)
                                 { nfiles:       'u32' },
                                 { file_offset:  'u32' },
                                 { npackages:    'u32' },
                                 { index_ptr:    'u32' } ])) // ptr to index table after packages
  }

  bp.seek(hd.files_ptr)
  var file_table = []
  for (var i = 0; i < hd.files_size; i++) {
    file_table.push(bp.read([ { name_ptr:     'u32' },
                              { data_ptr:     'u32' } ]))
  }

  console.log(sprintf('read %u packages, %u files', package_table.length, file_table.length));

  // Process children
  var packages = package_table.map(ent => read_package(bp, base, ent)),
      files = file_table.map(ent => read_file(bp, base, ent))

  return { type:     'xbin',
           version:  'K3D',
           unk3:     hd.unk3,
           packages: packages,
           files:    files,
           children: [ packages[0] ] }
}

function read_package(bp, base, raw) {
  var name = readstr(bp, base + raw.name_ptr)

  var subpackages = []
  bp.seek(raw.index_ptr)
  for (var i = 0; i < raw.npackages; i++) subpackages.push(bp.read('u32'))

  var subfiles = []
  for (var i = 0; i < raw.nfiles; i++) subfiles.push(raw.file_offset + i)

  return { type:        'package',
           name:        name,
           pretty:      name.match(/[^.]*$/)[0],
           subpackages: subpackages,
           subfiles:    subfiles,
           raw:         raw } // TODO: represent classes/indexptr/stuff better
}

function read_file(bp, base, raw) {
  var name = readstr(bp, base + raw.name_ptr)

  var base_ = base + raw.data_ptr

  // Read header
  bp.seek(base_)
  var hd = bp.read([ { magic:       'buf[8]' },
                     { filesize:    'u32' },
                     { unk1:        'u32' },  // 65001 or 932, part of XBIN
                     { name_ptr:    'u32' },
                     { sdata_ptr:   'u32' },
                     { xrefs_ptr:   'u32' },
                     { classes_ptr: 'u32' } ])

  var magic = Array.from(new Uint8Array(hd.magic))
  if (magic.every((v,i) => v == "XBIN\x34\x12\x02\x00".charCodeAt(i))) {
    // little-endian
  } else if (magic.every((v,i) => v == "XBIN\x12\x34\x02\x00".charCodeAt(i))) {
    // big-endian
 // bp.flipEndianness()
  } else {
    throw new Error("Bad magic number")
  }
  assert(hd.unk1 == 65001 || hd.unk1 == 932, "unk1 != 65001 && unk1 != 932")
  assert(hd.sdata_ptr == 0x20, "sdata_ptr != 0x20")

  // Read static data
  bp.seek(base_ + hd.sdata_ptr)
  var sdata_n = bp.read('u32'),
      sdata   = bp.read('buf[' + sdata_n + ']')

  // Read xrefs
  bp.seek(base_ + hd.xrefs_ptr)
  var xrefs_n = bp.read('u32'),
      xrefs   = []
  for (var i = 0; i < xrefs_n; i++) xrefs[i] = bp.read('u32')

  // Read classes
  bp.seek(base_ + hd.classes_ptr)
  var classes_n = bp.read('u32'),
      ptrs      = [],
      classes   = []
  for (var i = 0; i < classes_n; i++) ptrs[i] = bp.read('u32')
  for (var i = 0; i < classes_n; i++) classes[i] = read_class(bp, base_, ptrs[i])

  var children = []
  if (xrefs.length > 0) {
    children.push({ type:   'xrefs',
                    pretty: '(xrefs)',
                    xrefs:   xrefs })
  }
  children = children.concat(classes)

  return { type:        'file',
           name:        name,
           pretty:      name.match(/[^.]*$/)[0],
           static_data: sdata,
           xrefs:       xrefs,
           classes:     classes,
           children:    children }
}

function read_class(bp, base, offset) {
  bp.seek(base + offset)
  var class_ = bp.read([ { name_ptr:    'u32' },
                         { hash:        'u32' },
                         { ptr_fields:  'u32' },
                         { ptr_methods: 'u32' },
                         { ptr_consts:  'u32' },
                         { unk1:        'u32' } ])

  var name = readstr(bp, base + class_.name_ptr)
  var fields = [], methods = [], consts = []

  // Read fields
  bp.seek(base + class_.ptr_fields)
  var n = bp.read('u32'), ptrs = []
  for (var i = 0; i < n; i++) ptrs[i] = bp.read('u32')
  for (var i = 0; i < n; i++) fields[i] = read_field(bp, base, ptrs[i])

  // Read methods
  bp.seek(base + class_.ptr_methods)
  var n = bp.read('u32'), ptrs = []
  for (var i = 0; i < n; i++) ptrs[i] = bp.read('u32')
  for (var i = 0; i < n; i++) methods[i] = read_method(bp, base, ptrs[i])

  // Read constants
  bp.seek(base + class_.ptr_consts)
  var n = bp.read('u32'), ptrs = []
  for (var i = 0; i < n; i++) ptrs[i] = bp.read('u32')
  for (var i = 0; i < n; i++) consts[i] = read_const(bp, base, ptrs[i])

  return { type:     'class',
           hash:     class_.hash,
           name:     name,
           pretty:   sprintf('%s (%04x)', name.match(/[^.]*$/)[0], class_.unk1),
           fields:   fields,
           methods:  methods,
           consts:   consts,
           // Hel classes: 0104 for exposed, 0008 for impl
           // Mint.Cast, Mint.Debug: 0108
           // Enum: 0002
           // Scn.Title.CameraStateFirstAnim: 0004
           // Cmn.KeyChain.ModelSwingAlgorithm: 0004
           // GObj classes: 0105 for exposed, 0008 for impl
           // Scn.Step.LChara.Common.CameraFilterCtrl: 0001
           unk1:     class_.unk1,
           children: fields.concat(methods, consts) }
}

function read_field(bp, base, offset) {
  bp.seek(base + offset)
  var field = bp.read([ { name_ptr:     'u32' },
                        { hash:         'u32' },
                        { typename_ptr: 'u32' },
                        { flags:        'u32' } ])
  var name     = readstr(bp, base + field.name_ptr),
      typename = readstr(bp, base + field.typename_ptr)
  return { type:     'field',
           hash:     field.hash,
           name:     name,
           pretty:   field.flags == 0? name : sprintf('%s (%04x)', name, field.flags),
           typename: typename,
           flags:    field.flags }
}

function read_method(bp, base, offset) {
  bp.seek(base + offset)
  var method = bp.read([ { typesig_ptr: 'u32' },
                         { hash:        'u32' },
                         { code_ptr:    'u32' } ])
  var typesig = readstr(bp, base + method.typesig_ptr)

  var bytecode = []
  bp.seek(base + method.code_ptr)
  for (var i = 0; i < 0x10000; i++) { // FIXME: arbitrary max codelength
    var chunk = [bp.read('u8'), bp.read('u8'), bp.read('u8'), bp.read('u8')]
    Array.prototype.push.apply(bytecode, chunk)
    // check for `ret`
    if (chunk[0] == 0x47 || chunk[0] == 0x48) break
  }

  return { type:     'method',
           hash:     method.hash,
           name:     typesig.match(/[^ ]+(?=\()/)[0],
           pretty:   typesig,
           typesig:  typesig,
           bytecode: bytecode }
}

function read_const(bp, base, offset) {
  bp.seek(base + offset)
  var const_ = bp.read([ { name_ptr: 'u32' },
                         { value:    'u32' } ])
  var name = readstr(bp, base + const_.name_ptr)

  return { type:   'const',
           name:   name,
           pretty: name + " (" + const_.value + ")",
           value:  const_.value }
}


/*
//-------------------------------------------------------------------
function postprocessXbin(root, xbin) {
  root.packages.forEach(pack => {
    pack.subpackages = pack.subpackages.map(i => root.packages[i])
    pack.subfiles = pack.subfiles.map(i => root.files[i])
    pack.children = pack.subpackages.concat(pack.subfiles)
  })


  function setParent(parent, obj) {
    obj.parent = parent
    if (obj.children != null) {
      obj.children.forEach(setParent.bind(null, obj))
    }
  }
  setParent(null, root)

  var byHash  = {},
      byKey = {},
      key = 0
  function putHash(obj) {
    if (obj.hash != null) byHash[obj.hash] = obj
    obj.key = key++
    byKey[obj.key] = obj
    if (obj.children != null) {
      obj.children.forEach(putHash)
    }
  }
  putHash(root)

  return { tree:            root,
           by_hash:         byHash,
           by_key:          byKey }
}

export function parseXbin(buf) {
  try {
    var bp = new BinaryParser(buf)
    bp.flipped = true

    var root = read_xbin(bp)
    return postprocessXbin(root)
  } catch (err) {
    console.warn(err.stack)
    throw err
  }
}
*/
