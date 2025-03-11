import { Component } from "solid-js";

const Screenshot: Component<{ data_url: string }> = (props) => {
  return (<img src={props.data_url} />)
};

export default Screenshot;
