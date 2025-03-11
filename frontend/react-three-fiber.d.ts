export {};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      primitive: any;
    }
  }
}