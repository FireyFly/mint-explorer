import React, { Component } from 'react';
import PropTypes from 'prop-types';

import TreeNode from './TreeNode';

class Tree extends Component {
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
    const { data, keyExtractor, renderNode, ...rest } = this.props;
    return (
      <ul {...rest}>
        { data.map(this.renderChildNode) }
      </ul>
    );
  }
}

Tree.defaultProps = {
  keyExtractor(any) {
    if (typeof any !== 'object' || any === null || !('key' in any)) {
      throw new Error(`Tree: default keyExtractor expects objects with a 'key' property, but instead received ${any}`);
    }
    return any.key;
  },
};

Tree.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  renderNode: PropTypes.func.isRequired,
  keyExtractor: PropTypes.func,
};

export default Tree;
