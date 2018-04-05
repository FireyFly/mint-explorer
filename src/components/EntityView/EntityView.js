import React from 'react';
import PropTypes from 'prop-types';
import HexdView from '../HexdView';
/*
import {
  disassemble,
  prettyxref,
  render_disassembly, render_disassembly_plain,
  showPackageInfo,
} from '../../mint/disassembler';
*/

function EntityView({
  entity,
}) {
  const { type } = entity;
  switch (type) {
    case 'method':
      return <HexdView data={entity.bytecode} />;

    case 'sdata':
      return <HexdView data={entity.sdata} />;

    default:
      return <pre>EntityView: unimplemented: {type}</pre>;
  }
}

EntityView.propTypes = {
  entity: PropTypes.object.isRequired,
};

export default EntityView;
