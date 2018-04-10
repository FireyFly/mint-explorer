import React from 'react';
import PropTypes from 'prop-types';
import Breadcrumb from '../Breadcrumb';

function extractEntityPath(entity) {
  const path = [];
  let obj = entity;
  while (obj.parent != null) {
    path.push(obj);
    obj = obj.parent;
  }
  // first package is the empty/root package
  return path.reverse().slice(1);
}

const renderBreadcrumbItem = ({ pretty, name, type }) => (
  <span className={`node ${type}`}>{ pretty || name || '(none)' }</span>
);

/** Renders a breadcrumb for a Mint entity, as located in the EntityTree. */
function EntityBreadcrumb({
  entity,
}) {
  return (
    <Breadcrumb
      data={extractEntityPath(entity)}
      renderItem={renderBreadcrumbItem}
    />
  );
}

EntityBreadcrumb.propTypes = {
  entity: PropTypes.object.isRequired,
};

export default EntityBreadcrumb;
