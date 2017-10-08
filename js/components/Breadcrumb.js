export function renderBreadcrumb(ent, xbin) {
  var path = [], obj = ent
  while (obj.parent != null) {
    path.push(obj)
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


