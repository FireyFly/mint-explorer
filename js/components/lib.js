/** Base class for components */
export class Component {
  constructor(props) {
    this.props = props
    this.state = {}
  }

  /** Merge `merge` into the current state */
  setState(merge) {
    Object.assign(this.state, merge)
    // Redraw if state changed--let's assume it did
    this.rerender(this._root)
  }

  /** Default rerender function */
  rerender(root) {
    this._parent.replaceChild(this.render(), this._root)
  }
}

/** Append a component or element to a parent DOM element */
export function appendTo(parent, comp) {
  if (comp instanceof Component) {
    comp._parent = parent
    comp._root = comp.render()
    parent.appendChild(comp._root)
  } else if (typeof comp == 'string') {
    parent.appendChild(document.createTextNode(comp))
  } else {
    parent.appendChild(comp)
  }
}

export function mkComponent(Ctor, props, ...children) {
  props.children = children
  return new Ctor(props)
}

export function mkDOM(tag, props, ...children) {
  const el = document.createElement(tag)
  const { onClick } = props
  Object.assign(el, props)
  if (onClick != null) el.addEventListener('click', onClick, false)
  for (let child of children) appendTo(el, child)
  return el
}

export function mk(tagOrCtor, ...args) {
  if (typeof tagOrCtor == 'string') return mkDOM(tagOrCtor, ...args)
  else if (tagOrCtor instanceof Function) return mkComponent(tagOrCtor, ...args)
  else throw new Error("mk: bad first argument type")
}
