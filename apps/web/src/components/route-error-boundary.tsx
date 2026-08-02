/** Error boundary around lazy route content with a recovery UI and retry support. */

"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";

export interface RouteErrorBoundaryProps {
  children: React.ReactNode;
  /** Called after the boundary resets so the parent can recreate lazy routes. */
  onRetry: () => void;
}

interface RouteErrorBoundaryState {
  error: Error | null;
}

export class RouteErrorBoundary extends React.Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { error };
  }

  handleRetry = () => {
    this.setState({ error: null });
    this.props.onRetry();
  };

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="h-full w-full flex flex-col items-center justify-center gap-3 p-8 text-center"
        >
          <h2 className="text-lg font-semibold">Couldn&apos;t load this page</h2>
          <p className="text-sm text-muted-foreground">
            The route failed to load. Check your connection and try again.
          </p>
          <Button className="mt-2" onClick={this.handleRetry}>
            Try Again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
