import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { sprintf } from '../../utils';

const chunksOf = (arr, n) => {
  const res = [];
  for (let i = 0; i < arr.length; i += n) {
    res.push(arr.slice(i, i + n));
  }
  return res;
};

const isPrintable = v => (0x20 <= v && v < 0x7F);

const classOf = (v) => {
  if (v === 0x00) return 'zero';
  else if (0x01 <= v && v < 0x20) return 'low';
  else if (0x20 <= v && v < 0x7F) return 'print';
  else if (0x7F <= v && v < 0xFF) return 'high';
  return 'all';
};

function renderHexdRow(chunk, offset, n) {
  const indices = [...Array(n)].map((_, i) => i);
  const bytes = indices.map(i => chunk[i]);

  const getRenderValue = type => (v, i) => (
    <span key={`${type}-${i}`} className={classOf(v)}>
      {[
        i % 8 === 0 && ' ',
        v == null && (type === 'hex' ? '   ' : ' '),
        v != null && type === 'hex' && sprintf(' %02x', v),
        v != null && type === 'char' && (isPrintable(v) ? String.fromCharCode(v) : '.'),
      ].filter(Boolean)}
    </span>
  );

  return [
    <span className="address">
      { sprintf('%5x%03x', offset >> 4, offset & 0xFFFF) }
    </span>,
    ...bytes.map(getRenderValue('hex')),
    ' ',
    ...bytes.map(getRenderValue('char')),
  ];
}

class HexdView extends Component {
  render() {
    const { data, chunkSize } = this.props;
    const u8 = new Uint8Array(data);

    const rows = chunksOf(u8, chunkSize)
      .map((chunk, i) => renderHexdRow(chunk, i * chunkSize, chunkSize))
      .map(res => [res, '\n']);

    return <pre className="hexdump">{rows}</pre>;
  }
}

HexdView.defaultProps = {
  chunkSize: 16,
};

HexdView.propTypes = {
  data: PropTypes.instanceOf(ArrayBuffer).isRequired,
  chunkSize: PropTypes.number,
};

export default HexdView;
