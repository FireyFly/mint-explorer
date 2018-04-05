import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { sprintf } from '../../utils';
import { instructionSpecs } from '../../mint/disassembler';

function collectStatisticsOf(entity) {
  const opcodeUsage = {};

  function traverse(ent) {
    if (ent.type === 'method') {
      const u8 = new Uint8Array(ent.bytecode);
      for (let i = 0; i < u8.length; i += 4) {
        const op = u8[i];
        if (opcodeUsage[op] == null) opcodeUsage[op] = 0;
        opcodeUsage[op]++;
      }
    }
    if (ent.children != null) {
      ent.children.forEach(traverse);
    }
  }

  traverse(entity);

  return { opcodeUsage };
}

class EntityStatisticsView extends Component {
  render() {
    const { entity, xbin } = this.props;
    const { opcodeUsage } = collectStatisticsOf(entity);

    const specs = instructionSpecs[xbin.version];

    const ascending = (a, b) => a - b;
    const nameOf = op => specs[op].format.split(/\s{2,}/)[0];

    return (
      <pre>
        <strong>(opcode frequency)</strong>{'\n\n'}
        {
          Object.keys(opcodeUsage).map(Number).sort(ascending)
            .map(op => (
              specs[op] == null
                ? sprintf('>>  %02x  ×%-6u\n', op, opcodeUsage[op])
                : sprintf('    %02x  ×%-6u  %s\n', op, opcodeUsage[op], nameOf(op))
            ))
        }
      </pre>
    );
  }
}

EntityStatisticsView.propTypes = {
  entity: PropTypes.object.isRequired,
  xbin: PropTypes.object.isRequired,
};

export default EntityStatisticsView;
