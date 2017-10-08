import { printf } from './utils.js'
import { parseXbin } from './mint/loader.js'
import { renderView } from './components/MintView.js'
import { renderTree, expandInit } from './components/Tree.js'

var bench = (function () {
  var start
  function tick() {
    start = Date.now()
  }
  function tock(msg) {
    var delta = Date.now() - start
    printf("%4d.%03d %s", Math.floor(delta / 1000), delta % 1000, msg || "Tock")
    start = Date.now()
  }
  return {tick: tick, tock: tock}
})()

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
      bench.tick()
      xbin = parseXbin(reader.result)
      bench.tock("parseXbin")

      var el = document.getElementById('tree')
      var html = renderTree(xbin)
      bench.tock("renderTree")
      el.innerHTML = html
      bench.tock("innerHTML=")
      expandInit(el)
      bench.tock("expandInit")
      var leaves = el.querySelectorAll('.leaf')
      Array.prototype.forEach.call(leaves, function (leaf) {
        leaf.addEventListener('click', treeOnClick, false)
      })
      bench.tock("init leaves")

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
