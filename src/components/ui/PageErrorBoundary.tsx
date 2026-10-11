import { Component, type ReactNode } from "react";
export class PageErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="recovery-page" role="alert">
        <h1 className="font-display text-4xl">Let’s try that page again.</h1>
        <p className="my-5">
          The page could not load. Your cart is saved on this device.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => window.location.reload()}
        >
          Reload page
        </button>
        <a className="text-link ml-5" href="/">
          Return home
        </a>
      </main>
    ) : (
      this.props.children
    );
  }
}
