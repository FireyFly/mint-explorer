import { tick, tock, sprintf, asyncRead } from './utils.js'
import { parseXbin } from './mint/loader.js'
import { renderView } from './components/MintView.js'
import { renderTree, expandInit } from './components/Tree.js'
import './styles/style.css';
import './styles/expand-tree.css';
import './styles/theme.css';

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

const treeContEl = document.createElement('div');
treeContEl.id = 'tree-cont';

const browseEl = document.createElement('input');
browseEl.type = 'file';
browseEl.multiple = 'multiple';
browseEl.id = 'file-selector';

const treeEl = document.createElement('div');
treeEl.id = 'tree';

treeContEl.appendChild(browseEl);
treeContEl.appendChild(treeEl);

const viewContEl = document.createElement('div');
viewContEl.id = 'view-cont';
viewContEl.appendChild(document.createTextNode('(Select a file)'));

document.body.appendChild(treeContEl);
document.body.appendChild(viewContEl);

browseEl.addEventListener('change', () => loadFiles(browseEl.files), false);
