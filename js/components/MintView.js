import { sprintf } from '../utils.js'
import { disassemble, render_disassembly } from '../mint/disassembler.js'
import { expandTreePath } from './Tree.js'
import { renderBreadcrumb } from './Breadcrumb.js'

export function renderView(cont, xbin, key) {
  var ent = xbin.by_key[key]

  cont.innerHTML = ""

  // Make sure to expand the tree path up from `ent`
  expandTreePath(ent)

  // Breadcrumb
  cont.appendChild(renderBreadcrumb(ent, xbin))

  // Metadata
  var dl = document.createElement('dl')
  dl.classList.add('metadata')
  function addEntry(key, value) {
    var dt = document.createElement('dt'),
        dd = document.createElement('dd')
    dt.appendChild(document.createTextNode(key))
    dd.appendChild(document.createTextNode(value))
    dl.appendChild(dt)
    dl.appendChild(dd)
  }
  addEntry('Key', sprintf("%d", ent.key))
  if (ent.hash) addEntry('Hash', sprintf("%08x", ent.hash))

  switch (ent.type) {
    case 'field':
      addEntry('Type', ent.typename)
      addEntry('Flags', sprintf("%04x", ent.flags))
      break
  }

  cont.appendChild(dl)

  // Main content
  switch (ent.type) {
    case 'method':
      var instrs = disassemble(ent, xbin)
      var pre = render_disassembly(instrs)
      cont.appendChild(pre)
      break

    case 'xrefs':
      var pre = document.createElement('pre')
      ent.xrefs.forEach((v,i) => {
        pre.appendChild(document.createTextNode(sprintf("%4u %02x %08x %s\n", i, i, v, prettyxref(v, ent, xbin))))
      })
      cont.appendChild(pre)
      break

    default:
      cont.appendChild(document.createTextNode("unimplemented: " + ent.type))
  }
}
