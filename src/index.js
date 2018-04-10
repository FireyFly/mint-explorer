import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

import './styles/style.css';
import './styles/expand-tree.css';
import './styles/theme.css';

const container = document.createElement('div');
document.body.appendChild(container);
ReactDOM.render(<App />, container);
