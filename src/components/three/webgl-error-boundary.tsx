"use client";

import { Component, type ReactNode } from "react";

/**
 * A live event's projector screen must never show a broken black canvas.
 * Catches any runtime failure from the 3D podium (WebGL context loss, a
 * driver quirk, whatever) and falls back to the flat 2D winner reveal.
 */
export class WebglErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[podium] 3D scene failed, falling back to 2D reveal:", error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
