import React from 'react';
import PropTypes from 'prop-types';

import HexdView from '../HexdView';
import MintDisassemblyView from '../MintDisassemblyView';
/*
import {
  prettyxref,
  showPackageInfo,
} from '../../mint/disassembler';
*/

function EntityView({
  entity,
  xbin,
}) {
  const { type } = entity;
  switch (type) {
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
