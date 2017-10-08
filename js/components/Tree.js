import {Component, mk} from './lib.js'

const {li, ul, span} = 'li ul span'
  .split(' ')
  .reduce((obj, tag) => Object.assign(obj, {[tag]: mk.bind(null, tag)}), {})

export class TreeNode extends Component {
  constructor(props) {
    super(props)
    this.state = { expanded: false }
  }

  isExpanded() {
    return this.state.expanded
  }

  toggle() {
    this.setState({ expanded: !this.state.expanded })
  }

  render() {
    const { children, label, className, onClick } = this.props
    const nodeClassName = className != null? `node ${className}` : 'node'
    if (children.length > 0) {
      // Internal node
      return li({},
               span({className:'expand', onClick: () => this.toggle()}, '⊞'),
               span({className:nodeClassName, onClick}, label),
               ul({}, ...children)
             )
    } else {
      // Leaf node
      return li({className:'leaf'},
               span({className:'noexpand'}, ''),
               span({className:nodeClassName, onClick}, label)
             )
    }
  }

  rerender(root) {
    root.querySelector('.expand').textContent = this.state.expanded? "⊟" : "⊞"
    root.querySelector('ul').style.display = this.state.expanded? 'block' : 'none'
  }
}

export function buildNodeTree(xbin, onClick) {
  function buildNode(node) {
    const children = (node.children || []).map(buildNode)
    const label = node.pretty || node.name || "(none)"

    const isImplicit = (node.type == 'package' && node.name == '')

    return mk(TreeNode, {
      className: node.type + (isImplicit? ' implicit' : ''),
      onClick() { onClick(node.key) },
      label,
    }, ...children)
  }

  const children = xbin.tree.children[0].children.map(buildNode)
  return ul({className:'function-tree'}, ...children)
}

// TODO
export function expandTreePath(ent) {
  /*
  var obj = ent
  while (obj.parent != null) {
    if (obj.children != null && obj.children.length > 0) {
      var el = document.querySelector('[data-key="' + obj.key + '"]')
      if (el != null && !isToggled(el)) toggle.call(el)
    }
    obj = obj.parent
  }
  */
}
