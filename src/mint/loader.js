import { assert, sprintf } from '../utils.js'
import BinaryParser from '../binaryparser.js'
import { readMintV1 } from './loader-rtdl.js'
import { readMintV2 } from './loader-k3d.js'

function read_xbin(bp) {
  var base = bp.cursor

  // Read magic & endianness
  // magic is "XBIN\x34\x12\x02\x00" for little-endian,
  //          "XBIN\x12\x34\x02\x00" for big-endian
  const magic = Array.from(new Uint8Array(bp.read('buf[8]')))
  if (magic.every((v,i) => v == "XBIN\x34\x12\x02\x00".charCodeAt(i))) {
    // little-endian
    var hd = bp.read([ { filesize:      'u32' },
                       { unk1:          'u32' } ])   // 65001
    assert(hd.unk1 == 65001, 'unk1 != 65001');
    return readMintV2(bp);

  } else if (magic.every((v,i) => v == "XBIN\x12\x34\x02\x00".charCodeAt(i))) {
    // big-endian
    bp.flipEndianness()
    var hd = bp.read([ { filesize:      'u32' },
                       { unk1:          'u32' } ])   // 65001
    assert(hd.unk1 == 65001, 'unk1 != 65001');
    return readMintV1(bp);
  } else {
    throw new Error("Bad magic number")
  }
}

function postprocessXbin(root) {
  if (root.packages == null) {
    const mkPackage = name => ({
      type: 'package',
      name: name,
      pretty: name.match(/[^.]*$/)[0],
      subpackages: [],
      subfiles: [],
      raw: null,
    })

    const fullToPackage = {
      '': mkPackage(''),
    }
    const packageTree = {
      name: '',
      children: {},
    }

    root.files.forEach((file) => {
      // file.name = full name
      const path = file.name.split('.').slice(0, -1)

      let pack = packageTree
      for (let part of path) {
        const fqname = [pack.name, part].filter(Boolean).join('.')
        if (pack.children[part] == null) {
          pack.children[part] = {
            name: fqname,
            children: {},
          }
          const newPackage = mkPackage(fqname)
          fullToPackage[pack.name].subpackages.push(newPackage)
          fullToPackage[fqname] = newPackage
        }
        pack = pack.children[part]
      }
      fullToPackage[path.join('.')].subfiles.push(file)
    });

    root.packages = Object.keys(fullToPackage).map(k => fullToPackage[k])
    root.children = [ fullToPackage[''] ]
  }

  root.packages.forEach(pack => {
    if (typeof pack.subpackages[0] == 'number') {
      pack.subpackages = pack.subpackages.map(i => root.packages[i])
    }
    if (typeof pack.subfiles[0] == 'number') {
      pack.subfiles = pack.subfiles.map(i => root.files[i])
    }
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

  return {
    tree:    root,
    version: root.version,
    by_hash: byHash,
    by_key:  byKey,
  }
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
