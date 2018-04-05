import React from 'react';
import PropTypes from 'prop-types';

import EntityStatisticsView from '../EntityStatisticsView';
import HexdView from '../HexdView';
import MintDisassemblyView from '../MintDisassemblyView';

function EntityView({
  entity,
  xbin,
}) {
  const { type } = entity;
  switch (type) {
    case 'file':
    case 'package':
      return <EntityStatisticsView entity={entity} xbin={xbin} />;

    case 'method':
      return <MintDisassemblyView entity={entity} xbin={xbin} />;

    case 'sdata':
      return <HexdView data={entity.sdata} />;

    default:
      return <pre>EntityView: unimplemented: {type}</pre>;
  }
}

EntityView.propTypes = {
  entity: PropTypes.object.isRequired,
  xbin: PropTypes.object.isRequired,
};

export default EntityView;
