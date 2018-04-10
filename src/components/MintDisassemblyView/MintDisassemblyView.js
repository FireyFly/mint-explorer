import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { sprintf } from '../../utils';
import { disassemble } from '../../mint/disassembler';

const classOf = (v) => {
  if (v === 0x00) return 'zero';
  else if (0x01 <= v && v < 0x20) return 'low';
  else if (0x20 <= v && v < 0x7F) return 'print';
  else if (0x7F <= v && v < 0xFF) return 'high';
  return 'all';
};

function renderInstruction(instr) {
  return [
    // Address
    <span key="address" className="address">{sprintf('%4u ', instr.index)}</span>,
    // Bytecode
    ...instr.raw.map((byte, i) => (
      <span key={i} className={classOf(byte)}>{sprintf(' %02x', byte)}</span>
    )),
    // Human-readable part
    sprintf('  ; %s', instr.pretty),
  ];
}

class MintDisassemblyView extends Component {
  render() {
    const { entity, xbin } = this.props;
    const instrs = disassemble(entity, xbin);

    const rows = instrs
      .map(renderInstruction)
      .map(res => [res, '\n']);

    return <pre className="disasm">{rows}</pre>;
  }
}

MintDisassemblyView.propTypes = {
  entity: PropTypes.object.isRequired,
  xbin: PropTypes.object.isRequired,
};

export default MintDisassemblyView;
