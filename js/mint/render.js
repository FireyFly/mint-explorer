//-- View -----------------------------------------------------------
function renderBreadcrumb(ent, xbin) {
  var path = [], obj = ent
  while (obj.parent != null) {
    path.push(obj)
    if (obj.children != null && obj.children.length > 0) {
      var el = document.querySelector('[data-key="' + obj.key + '"]')
      if (el != null && !isToggled(el)) toggle.call(el)
    }
    obj = obj.parent
  }
  path = path.reverse().slice(1)  // first package is the empty/root package

  var breadcrumb = document.createElement('ul')
  breadcrumb.classList.add('breadcrumb')
  path.forEach(function (n) {
    var li = document.createElement('li')
    var span = document.createElement('span')
    span.classList.add('node', n.type)
    if (n.type == 'package' && n.name == '') span.classList.add('implicit')
    var name = n.pretty || n.name || "(none)"
    span.appendChild(document.createTextNode(name))
    li.appendChild(span)
    breadcrumb.appendChild(li)
  })

  return breadcrumb
}

function renderView(cont, xbin, key) {
  var ent = xbin.by_key[key]

  cont.innerHTML = ""

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
      var pre = disassemble(ent, xbin)
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


//-- Tree -----------------------------------------------------------
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

  var res = xbin.tree.children[0].children.map(renderNode).join("")
  return '<ul class="function-tree">' + res + '</ul>'
}
