import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
}

/**
 * Last line of defense: if a screen throws while drawing, show a calm message with a way
 * back instead of a blank or red screen. Everything saved (trips, data on the server) is
 * untouched; Try Again simply draws the app again.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unexpected error while drawing the app', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <EmptyState
        tone="error"
        title="Something went wrong"
        body="TripHub ran into a problem showing this screen. Your trips are safe. Try again, and if it keeps happening, restart the app."
      >
        <Button label="Try Again" onPress={() => this.setState({ failed: false })} />
      </EmptyState>
    );
  }
}
