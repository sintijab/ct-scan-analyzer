import { Component, For, createResource } from "solid-js";
import { A } from "@solidjs/router";

import { fetchPatients } from "../api";

const PatientSelector: Component = () => {
  const [patients] = createResource(fetchPatients);

  return (
    <div class="d-flex flex-column flex-shrink-0 p-3" >
      <ul class="nav nav-pills flex-column mb-auto">
        <For each={patients()}>
          {(patient, _index) =>
            <li class="nav-item">
              <A class="nav-link" href={`/patients/${patient.id}`}>{patient.name}</A>
            </li>
          }
        </For>
      </ul>
    </div>
  );
};

export default PatientSelector;
