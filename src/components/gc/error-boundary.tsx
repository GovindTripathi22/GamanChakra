"use client";

import { Component, type ReactNode } from "react";

/** Contains a failure to one panel so the rest of the screen keeps working. */
export class SafeBoundary extends Component<{ children: ReactNode; label?: string; minHeight?: number }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.warn(`[ui] ${this.props.label ?? "panel"} recovered from:`, error.message); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid place-items-center text-center p-6" style={{ minHeight: this.props.minHeight ?? 160 }} role="status">
        <div>
          <p className="text-sm font-medium">{this.props.label ?? "This panel"} couldn’t load.</p>
          <button onClick={() => this.setState({ error: null })} className="mt-2 text-xs font-semibold text-[var(--gc-brand)]">Try again</button>
        </div>
      </div>
    );
  }
}
