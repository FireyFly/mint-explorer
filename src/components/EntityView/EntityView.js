import React from 'react';
import PropTypes from 'prop-types';
/*
import { hexdump } from '../../utils';
import {
  disassemble,
  prettyxref,
  render_disassembly, render_disassembly_plain,
  showPackageInfo,
} from '../../mint/disassembler';
*/

function MintView({
  entity,
}) {
  const { type } = entity;
  switch (type) {
    default:
      return <pre>MintView: unimplemented: {type}</pre>;
  }
}

MintView.propTypes = {
  entity: PropTypes.object.isRequired,
};

export default MintView;
