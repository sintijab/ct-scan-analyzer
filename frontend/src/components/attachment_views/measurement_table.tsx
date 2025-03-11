import { Component, For } from "solid-js";
import { createAsync } from "@solidjs/router";
import { fetchRelativeUrl } from "../../api.js";
import { beautifyUriElement } from "../../utils.js";


async function fetchScalars(data_url: string): Promise<Record<string, string>> {
  let data: Record<string, any> = await fetchRelativeUrl(data_url);
  let keys = Object.keys(data).sort();
  let result: Record<string, string> = keys
    .filter((key) => data[key]["type"] == "Scalar")
    .reduce((accumulator, key) => {
      let val = data[key];
      let valString = `${val["value"].toFixed(2)} ${val["unit"] || ""}`;
      return { ...accumulator, [beautifyUriElement(key.slice(1))]: valString };
    }, {});
  return result;
}


const MeasurementTable: Component<{ data_url: string }> = (props) => {
  const data = createAsync(() => fetchScalars(props.data_url));
  return (<div>
    <table>
      <thead>
        <tr>
          <th>Measurement</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        <For each={Object.entries(data() || {})}>
          {([name, val]) => <tr>
            <td>{name}</td>
            <td>{val}</td>
          </tr>}
        </For>
      </tbody>
    </table>
  </div>);
};

export default MeasurementTable;
