import React from 'react';
import PropTypes from 'prop-types';

function Breadcrumb({
  data,
  keyExtractor,
  renderItem,
}) {
  return (
    <ul className="breadcrumb">
      {
        data.map(node => (
          <li key={keyExtractor(node)}>
            { renderItem(node) }
          </li>
        ))
      }
    </ul>
  );
}

Breadcrumb.defaultProps = {
  keyExtractor(any) {
    if (typeof any !== 'object' || any === null || !('key' in any)) {
      throw new Error(`Tree: default keyExtractor expects objects with a 'key' property, but instead received ${any}`);
    }
    return any.key;
  },
  renderItem(any) {
    if (typeof any !== 'object' || any === null || !('name' in any)) {
      throw new Error(`Tree: default renderItem expects objects with 'name', but instead received ${any}`);
    }
    return <span className="node">{ any.name }</span>;
  },
};

Breadcrumb.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  keyExtractor: PropTypes.func,
  renderItem: PropTypes.func,
};

export default Breadcrumb;
