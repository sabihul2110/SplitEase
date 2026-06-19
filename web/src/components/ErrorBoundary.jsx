// web/src/components/ErrorBoundary.jsx


import { Component } from "react";
import Maintenance from "../pages/system/Maintenance";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Uncaught render error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return <Maintenance reason="error" />;
    }
    return this.props.children;
  }
}