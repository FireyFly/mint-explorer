import { tick, tock, sprintf } from './utils.js'
import { parseXbin } from './mint/loader.js'
import { renderView } from './components/MintView.js'
import { renderTree, expandInit } from './components/Tree.js'

void function () {
  var xbin = null

  function treeOnClick() {
    var key  = this.dataset['key'],
        cont = document.getElementById('view-cont')
    renderView(cont, xbin, key)
  }

  function loadFiles(files) {
    var reader = new FileReader()
    reader.onload = function () {
      tick()
      xbin = parseXbin(reader.result)
      tock("parseXbin")

      var el = document.getElementById('tree')
      var html = renderTree(xbin)
      tock("renderTree")
      el.innerHTML = html
      tock("innerHTML=")
      expandInit(el)
      tock("expandInit")
      var leaves = el.querySelectorAll('.leaf')
      Array.prototype.forEach.call(leaves, function (leaf) {
        leaf.addEventListener('click', treeOnClick, false)
      })
      tock("init leaves")

      renderView(document.getElementById('view-cont'), xbin, 3731) // TODO: hack/temporary
    }
    reader.readAsArrayBuffer(files[0])
  }

  var el = document.querySelector('#file-selector')
  el.addEventListener('change', function () {
    loadFiles(el.files)
  }, false)

  if (el.files.length > 0) loadFiles(el.files)
}()
