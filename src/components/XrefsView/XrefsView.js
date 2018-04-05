import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { sprintf } from '../../utils';
import { prettyxref } from '../../mint/disassembler';

class XrefsView extends Component {
  render() {
    const { entity, xbin } = this.props;
    return (
      <pre>
        {
          entity.xrefs.map((v, i) => (
            typeof v === 'string'
              ? sprintf("%4u %02x %s\n", i, i, v)
              : sprintf("%4u %02x %08x %s\n", i, i, v, prettyxref(v, entity, xbin))
          ))
        }
      </pre>
    );
  }
}

XrefsView.propTypes = {
  entity: PropTypes.object.isRequired,
  xbin: PropTypes.object.isRequired,
};

export default XrefsView;
