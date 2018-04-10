import React, { Component } from 'react';
import PropTypes from 'prop-types';

class TreeNode extends Component {
  state = {
    isExpanded: false,
  }

  toggle = () => {
    const { isExpanded } = this.state;
    this.setState({ isExpanded: !isExpanded });
  }

  renderChildNode = (node) => {
    const { keyExtractor, renderNode } = this.props;
    return (
      <TreeNode
        key={keyExtractor(node)}
        data={node}
        {...{ keyExtractor, renderNode }}
      />
    );
  }

  render() {
    const { data, renderNode } = this.props;
    const { isExpanded } = this.state;
    const children = data.children || [];
    const isLeaf = (children.length === 0);
    return (
      <li className={isLeaf ? 'leaf' : ''}>
        { isLeaf && <span className="noexpand" /> }
        { !isLeaf &&
          <span className="expand" role="menuitem" onClick={this.toggle}>
            { this.state.isExpanded ? '⊟' : '⊞' }
          </span>
        }
        { renderNode(data) }
        { isExpanded &&
          <ul>{ children.map(this.renderChildNode) }</ul>
        }
      </li>
    );
  }
}

TreeNode.propTypes = {
  data: PropTypes.object.isRequired,
  renderNode: PropTypes.func.isRequired,
  keyExtractor: PropTypes.func.isRequired,
};

export default TreeNode;
