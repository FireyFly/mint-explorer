// TODO: rewrite this to be more reusable and encapsulated and stuff

//-- Expansion --------------------------------------------
export function isToggled(el) {
  var toggled = el.dataset['toggled']
  if (toggled == null) toggled = "false"  // Default to contracted
  return toggled == 'true'
}
function setToggled(el, value) {
  el.dataset['toggled'] = String(value)
}

export function toggle() {
  var toggled = isToggled(this)
  toggled = !toggled

  setToggled(this, toggled)
  this.textContent = toggled? "⊟" : "⊞"

  var el = this
  while (el.nodeName.toLowerCase() != 'li' && el.parentNode != null) el = el.parentNode
  var ul = el.querySelector('ul')
  if (ul != null) ul.style.display = toggled? 'block' : 'none'
}

// Init expandable tree
export function expandInit(rootEl) {
  var expandEls = rootEl.querySelectorAll('.expand')
  Array.prototype.forEach.call(expandEls, function (el) {
    el.addEventListener('click', toggle, false)
  })
}

//-- Render -----------------------------------------------
// TODO: these are specific to Mint's use of the tree…
export function expandTreePath(ent) {
  var obj = ent
  while (obj.parent != null) {
    if (obj.children != null && obj.children.length > 0) {
      var el = document.querySelector('[data-key="' + obj.key + '"]')
      if (el != null) el = el.parentNode.querySelector('.expand')
      if (el != null && !isToggled(el)) toggle.call(el)
    }
    obj = obj.parent
  }
}

function entify(str) {
  return str.replace(/[<>&]/g, function (ch) {
    return {'<':'&lt;', '>':'&gt;', '&':'&amp;'}[ch]
  })
}

export function renderTree(xbin) {
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
                        '<span class="expand">⊞</span>',
                        '<span data-key="{{key}}" class="node {{classes}}">{{pretty}}</span>',
                        '<ul>{{children}}</ul>',
                      '</li>' ].join("")

      var children = node.children.map(renderNode).join("")
      return format(pattern, { key:      node.key,
                               classes:  node.type + (isImplicit? ' implicit' : ''),
                               pretty:   entify(name),
                               children: children })

    } else {
      //-- Leaf node
      var pattern = [ '<li class="leaf">',
                        '<span class="noexpand"></span>',
                        '<span data-key="{{key}}" class="node {{classes}}">{{pretty}}</span>',
                      '</li>' ].join("")

      return format(pattern, { key:      node.key,
                               classes:  node.type,
                               pretty:   entify(name) })

    }
  }

  var res = xbin.tree.children[0].children.map(renderNode).join("")
  return '<ul class="function-tree">' + res + '</ul>'
}
