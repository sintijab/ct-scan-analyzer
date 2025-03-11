import { useParams } from "@solidjs/router";
import { Component, createEffect, createSignal, For, Match, Show, Switch } from "solid-js";
import { createAsync } from "@solidjs/router";
import { ThreeJSContext, INITIAL_POINTS, ThreeJSContextType } from "../threeJSContext.js";

import { API_ROOT, fetchRelativeUrl } from "../api.js";
import { beautifyUriElement } from "../utils.js";

import { fetchPatient, getAttachmentDataUrl } from "../api.js";
import MeasurementTable from "./attachment_views/measurement_table.jsx";
import Screenshot from "./attachment_views/screenshot.js";
import ThreeScene from "./Three.jsx";
import KonvaOverlay from "./KonvaOverlay.jsx";
import { createStore } from "solid-js/store";
import { Vector3 } from "three";

const PatientDetails: Component = () => {
  const [order, setOrder] = createSignal([1, 2]);
  const params = useParams();
  const patient = createAsync(() => params.id ? fetchPatient(params.id) : Promise.resolve(null));
  // TODO: get json document of model data from the patients attachments
  const attachments: any = createAsync(() => fetchRelativeUrl("/static/data/eb635c2c-d485-4f1f-af6f-64098f57010e.json"))
  const mockEndpoint = "/mitral_annulus/from_leaflets/saddle_shape/closed_spline";

  const [value, setValue] = createStore({ points: INITIAL_POINTS })

  const coordinate: ThreeJSContextType = [
    value,
    {
      setPoints(newPoints: Vector3[]) {
        setValue("points", newPoints)
      },
    },
  ]

  return (
    <div style="margin-top: 20px;">
      <Show when={patient()}>
        <h3>{patient()?.name}</h3>
        <h4 style="margin-top: 20px;">Patient Data</h4>
        <hr />
        <table>
          <tbody>
            <tr>
              <th>Date of Birth:</th>
              <td>{patient()!.date_of_birth}</td>
            </tr>
            <tr>
              <th>Sex:</th>
              <td>{patient()!.sex}</td>
            </tr>
            <tr>
              <th>Assigned Physician:</th>
              <td>{patient()!.assigned_physician}</td>
            </tr>
            <tr>
              <th>Notes:</th>
              <td>{patient()!.clinical_notes}</td>
            </tr>
          </tbody>
        </table>
        <h4 style="margin-top: 20px;">Attachments</h4>
        <hr />
        <For each={patient()?.attachments}>
          {(attachment) => <div>
            <h5 style="margin-top: 20px">{beautifyUriElement(attachment.name)}</h5>
            <Switch>
              <Match when={attachment.media_type == "application/com.laralab.analysis-primitives+json"}>
                <MeasurementTable data_url={getAttachmentDataUrl(attachment)} />
              </Match>
              <Match when={attachment.media_type == "image/jpeg"}>
                <Screenshot data_url={API_ROOT + getAttachmentDataUrl(attachment)} />
              </Match>
              <Match when={attachment.media_type == "model/gltf+json"}>
                <div>TODO: render gltf at {API_ROOT + getAttachmentDataUrl(attachment)}</div>
                <button onClick={() => setOrder([...order()].reverse())}>Reorder Layers</button>
                <ThreeJSContext.Provider value={coordinate}>
                  <Show when={attachments()}>
                    <div style="position: relative;">
                      <For each={order()}>{(orderNr) =>
                        <>
                          <div style="position: absolute;">
                            {orderNr === 1 && <ThreeScene url={`${API_ROOT}${getAttachmentDataUrl(attachment)}`} />}
                          </div>
                          <div style="position: absolute;">
                            {orderNr === 2 && <KonvaOverlay {...attachments()[mockEndpoint]} />}
                          </div>
                        </>
                      }
                      </For>
                    </div>
                  </Show>
                </ThreeJSContext.Provider>
              </Match>
            </Switch>
          </div>}
        </For>
      </Show>
    </div>
  );
};

export default PatientDetails;
