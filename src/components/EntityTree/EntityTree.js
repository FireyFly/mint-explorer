import React from 'react';
import PropTypes from 'prop-types';
import Tree from '../Tree';

/**
 * Renders a package/file/method/... tree for a given Mint archive file.
 * Clicking on a tree item triggers the provided `onClick`, which is passed
 * the entity in question.
 */
function EntityTree({
  xbin,
  onClick,
}) {
  const renderNode = (node) => {
    const { pretty, name, type } = node;
    const isImplicit = type === 'package' && name === '';
    return (
      <span
        role="menuitem"
        className={`node ${type} ${isImplicit ? 'implicit' : ''}`}
        onClick={() => onClick(node)}
      >
        {pretty || name || '(none)'}
      </span>
    );
  };

  return (
    <Tree
      className="function-tree"
      data={xbin.tree.children[0].children}
      renderNode={renderNode}
    />
  );
}

EntityTree.propTypes = {
  xbin: PropTypes.object.isRequired,
  onClick: PropTypes.func.isRequired,
};

export default EntityTree;
