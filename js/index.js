import { tick, tock, sprintf, asyncRead } from './utils.js'
import { parseXbin } from './mint/loader.js'
import { renderView } from './components/MintView.js'
import { renderTree, expandInit } from './components/Tree.js'

let xbin = null

function treeOnClick() {
  const key       = this.dataset['key'],
        container = document.getElementById('view-cont')
  renderView(container, xbin, key)
}

function loadFiles(files) {
  // TODO: support for loading multiple files
  return asyncRead(files[0])
    .then(res => res.arrayBuffer())
    .then(res => {
      const el = document.getElementById('tree')

      tick()
      xbin = parseXbin(res)
      tock("parseXbin")
      const html = renderTree(xbin)
      tock("renderTree")
      el.innerHTML = html
      tock("innerHTML=")
      expandInit(el)
      tock("expandInit")
      const elements = el.querySelectorAll('.node')
      for (const node of elements) {
        node.addEventListener('click', treeOnClick, false)
      }
      tock("init click handlers")

      // FIXME: hack/temporary--hardcoded ID
      renderView(document.getElementById('view-cont'), xbin, 1)
   // renderView(document.getElementById('view-cont'), xbin, 11721)
    })
}

var el = document.getElementById('file-selector')
el.addEventListener('change', () => loadFiles(el.files), false)

if (el.files.length > 0) loadFiles(el.files)
