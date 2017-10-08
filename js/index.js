import { tick, tock, sprintf, asyncRead } from './utils.js'
import { parseXbin } from './mint/loader.js'
import { appendTo } from './components/lib.js'
import { renderView } from './components/MintView.js'
import { buildNodeTree, renderTree, expandInit } from './components/Tree.js'

function loadFiles(files) {
  const container = document.getElementById('view-cont')

  // TODO: support for loading multiple files
  return asyncRead(files[0])
    .then(res => res.arrayBuffer())
    .then(res => {
      const el = document.getElementById('tree')

      tick()
      const xbin = parseXbin(res)
      tock("parseXbin")
      const tree = buildNodeTree(xbin, key => renderView(container, xbin, key))
      tock("buildNodeTree")
      appendTo(el, tree)
      tock("Tree appendTo")

      // FIXME: hack/temporary--hardcoded ID
      renderView(container, xbin, 3731)
    })
}

var el = document.getElementById('file-selector')
el.addEventListener('change', () => loadFiles(el.files), false)

if (el.files.length > 0) loadFiles(el.files)
