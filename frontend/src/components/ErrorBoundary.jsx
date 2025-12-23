import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null, rejected: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
  }

  componentDidMount() {
    this._onWindowError = (event) => {
      const err = event?.error || event;
      if (err) this.setState({ error: err });
    };

    this._onUnhandledRejection = (event) => {
      this.setState({ rejected: event?.reason ?? event });
    };

    window.addEventListener("error", this._onWindowError);
    window.addEventListener("unhandledrejection", this._onUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener("error", this._onWindowError);
    window.removeEventListener("unhandledrejection", this._onUnhandledRejection);
  }

  render() {
    const { error, errorInfo, rejected } = this.state;

    if (error || rejected) {
      const message = error?.message || String(error || rejected);
      const stack = error?.stack || "";
      const componentStack = errorInfo?.componentStack || "";

      return (
        <div style={{ padding: 16 }}>
          <h2 style={{ marginBottom: 8 }}>App crashed</h2>
          <div style={{ marginBottom: 8 }}>
            <strong>Error:</strong> {message}
          </div>
          {(stack || componentStack) && (
            <pre style={{ whiteSpace: "pre-wrap" }}>
              {stack}
              {componentStack}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
