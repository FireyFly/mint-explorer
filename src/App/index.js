import React, { Component } from 'react';
import PackageTree from './components/PackageTree';
import PackageTreeBreadcrumb from './components/PackageTreeBreadcrumb';
//import MintView from '../components/MintView';
import { tick, tock, asyncRead } from '../utils';
import { parseXbin } from '../mint/loader';

function loadXBinFile(file) {
  return asyncRead(file).then(res => res.arrayBuffer())
    .then((res) => {
      tick();
      const xbin = parseXbin(res);
      tock('parseXbin');
      return xbin;
    });
}

class App extends Component {
  state = {
    xbin: null,
    entityKey: 1,
  };

  handleFileChange = (ev) => {
    const file = ev.target.files[0];
    loadXBinFile(file)
      .then((xbin) => {
        this.setState({ xbin });
      })
      .catch(err => console.error(err));
  }

  handleTreeClick = ({ key }) => {
    this.setState({ entityKey: key });
  }

  render() {
    const { xbin, entityKey } = this.state;
    const entity = xbin && xbin.by_key[entityKey];
    return (
      <div>
        <div className="l-sidebar-cont">
          {/* Browse… */}
          <input type="file" onChange={this.handleFileChange} />
          {/* Tree */}
          { xbin && <PackageTree xbin={xbin} onClick={this.handleTreeClick} /> }
        </div>
        {/* Main view */}
        <div className="l-view-cont">
          { xbin && <PackageTreeBreadcrumb entity={entity} /> }
          {/*
          { xbin
              ? <MintView xbin={xbin} entity={entity} />
              : <p>(Select a file)</p>
          }
          */}
        </div>
      </div>
    );
  }
}

export default App;
