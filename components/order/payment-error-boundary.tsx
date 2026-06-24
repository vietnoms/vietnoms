"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Square's Web Payments SDK renders its inputs in third-party iframes and has no
 * internal error boundary, so an unexpected throw (e.g. a digital-wallet init
 * failure) can blank the whole payment subtree with no visible signal. This
 * boundary catches that and shows an actionable fallback instead of a dead box.
 */
export class PaymentErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Square PaymentForm crashed:", error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
