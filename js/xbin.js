
function readstr(bp, offset) {
  bp.seek(offset)
  var size = bp.read('u32')
  var res = ""
  for (var i = 0; i < size; i++) res += String.fromCharCode(bp.read('u8'))
  return res
}

//-------------------------------------------------------------------
function read_xbin(bp) {
  var base = bp.cursor

  // Read header
  var hd = bp.read([ { magic:         'buf[8]' },
                     { filesize:      'u32' },
                     { unk1:          'u32' }, // 65001
                     { unk2:          'u16' }, // 1
                     { unk3:          'u16' }, // (game-dependent)
                     { packages_size: 'u32' },
                     { packages_ptr:  'u32' },
                     { files_size:    'u32' },
                     { files_ptr:     'u32' } ])

  var magic = Array.from(new Uint8Array(hd.magic))
  assert(magic.every((v,i) => v == "XBIN4\x12\x02\x00".charCodeAt(i)), "Bad magic number")
  assert(hd.unk1 == 65001, "unk1 != 65001")
  assert(hd.unk2 == 1, "unk2 != 1")

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

  // Process children
  var packages = package_table.map(ent => read_package(bp, base, ent)),
      files = file_table.map(ent => read_file(bp, base, ent))

  return { type:     'xbin',
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
                     { unk1:        'u32' },
                     { name_ptr:    'u32' },
                     { sdata_ptr:   'u32' },
                     { xrefs_ptr:   'u32' },
                     { classes_ptr: 'u32' } ])

  var magic = Array.from(new Uint8Array(hd.magic))
  assert(magic.every((v,i) => v == "XBIN4\x12\x02\x00".charCodeAt(i)), "Bad magic number")
  assert(hd.unk1 == 65001, "unk1 != 65001")
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


//-------------------------------------------------------------------
function parseXbin(buf) {
  var bp = new BinaryParser(buf)
  bp.flipped = true

  var xbin = read_xbin(bp)

  xbin.packages.forEach(pack => {
    pack.subpackages = pack.subpackages.map(i => xbin.packages[i])
    pack.subfiles = pack.subfiles.map(i => xbin.files[i])
    pack.children = pack.subpackages.concat(pack.subfiles)
  })


  function setParent(parent, obj) {
    obj.parent = parent
    if (obj.children != null) {
      obj.children.forEach(setParent.bind(null, obj))
    }
  }
  setParent(null, xbin)

  var hash  = {},
      byKey = {},
      key   = 0
  function putHash(obj) {
    if (obj.hash != null) hash[obj.hash] = obj
    obj.key = key++
    byKey[obj.key] = obj
    if (obj.children != null) {
      obj.children.forEach(putHash)
    }
  }
  putHash(xbin)

  return { tree: xbin, by_hash: hash, by_key: byKey }
}


//-- renderTree -----------------------------------------------------
function entify(str) {
  return str.replace(/[<>&]/g, function (ch) {
    return {'<':'&lt;', '>':'&gt;', '&':'&amp;'}[ch]
  })
}

function renderTree(xbin) {
  function format(pat, obj) {
    return pat.replace(/{{(\w+)}}/g, function (_, key) {
      return obj[key]
    })
  }

  function renderNode(node) {
    var isInternal = node.children != null && node.children.length != 0;
    var name = node.pretty || node.name || "(none)"

    if (isInternal) {
      //-- Internal node
      var isImplicit = node.type == 'package' && node.name == ''

      var pattern = [ '<li>',
                        '<span class="expand" data-key="{{key}}">⊞</span>',
                        '<span class="node {{classes}}">{{pretty}}</span>',
                        '<ul>{{children}}</ul>',
                      '</li>' ].join("")

      var children = node.children.map(renderNode).join("")
      return format(pattern, { key:      node.key,
                               classes:  node.type + (isImplicit? ' implicit' : ''),
                               pretty:   entify(name),
                               children: children })

    } else {
      //-- Leaf node
      var pattern = [ '<li class="leaf" data-key="{{key}}">',
                        '<span class="noexpand"></span>',
                        '<span class="node {{classes}}">{{pretty}}</span>',
                      '</li>' ].join("")

      return format(pattern, { key:      node.key,
                               classes:  node.type,
                               pretty:   entify(name) })

    }
  }

//var res = []
  var res = xbin.tree.children.map(renderNode).join("")

//xbin.tree.children.forEach(function (k, i) {
//  res.push(renderNode(xbin.tree.ch[k]))
//})
  return '<ul class="function-tree">' + res + '</ul>'
}
