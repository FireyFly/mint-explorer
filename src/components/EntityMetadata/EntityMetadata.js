import React from 'react';
import PropTypes from 'prop-types';
import { sprintf } from '../../utils';

function EntityMetadata({
  entity,
}) {
  const isField = (entity.type === 'field');

  const entries = [
    ['Key', sprintf('%d', entity.key)],
    entity.hash && ['Hash', sprintf('%08x', entity.hash)],
    isField && ['Type', entity.typename],
    isField && ['Flags', sprintf('%04x', entity.flags)],
  ].filter(Boolean);

  return (
    <dl className="metadata">
      {
        entries.map(([key, value]) => [
          <dt key={`dt-${key}`}>{key}</dt>,
          <dd key={`dd-${key}`}>{value}</dd>,
        ])
      }
    </dl>
  );
}

EntityMetadata.propTypes = {
  entity: PropTypes.object.isRequired,
};

export default EntityMetadata;
