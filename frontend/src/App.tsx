import type { Component } from 'solid-js';

import Navbar from './components/navbar.jsx';
import PatientSelector from './components/patient_selector.jsx';
import PatientDetails from './components/patient_details.jsx';

const App: Component = () => {
  return (
    <div>
      <Navbar />
      <div class="container-fluid">
        <div class="row">
          <div class="col-2">
            <PatientSelector />
          </div>
          <div class="col-10">
            <PatientDetails />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
