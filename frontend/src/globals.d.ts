import { type Context } from "solid-js"

declare global {
  interface Window {
    VIEWER: any;
  }
}

declare function useContext<T>(context: Context<T>): T