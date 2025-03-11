import { createContext, useContext } from "solid-js";
import { Vector3 } from "three";

export const INITIAL_POINTS: Vector3[] = [];

const INITIAL_STORE_SETTER = {
  setPoints: () => {},
};

export type ThreeJSContextType = [
  { points: Vector3[] },
  { setPoints: (points: Vector3[]) => void }
];

const initialContext: ThreeJSContextType = [
  { points: INITIAL_POINTS },
  INITIAL_STORE_SETTER,
];

export const ThreeJSContext = createContext<ThreeJSContextType>(initialContext);

export const useThreeJSContext = () => {
  const context = useContext(ThreeJSContext);
  if (!context) {
    throw new Error("useThreeJSContext: cannot find a ThreeJSContext");
  }
  return context;
};
