function isToggled(el) {
  var toggled = el.dataset['toggled']
  if (toggled == null) toggled = "false"  // Default to contracted
  return toggled == 'true'
}
function setToggled(el, value) {
  el.dataset['toggled'] = String(value)
}

function toggle() {
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
function expandInit(rootEl) {
  var expandEls = rootEl.querySelectorAll('.expand')
  Array.prototype.forEach.call(expandEls, function (el) {
    el.addEventListener('click', toggle, false)
  })
}
