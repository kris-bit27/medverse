import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
    // Future: send to monitoring service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-8">
          <div className="text-center max-w-md space-y-4">
            <AlertTriangle className="w-12 h-12 mx-auto text-yellow-500" />
            <h2 className="text-xl font-bold">Něco se pokazilo</h2>
            <p className="text-muted-foreground text-sm">
              {this.state.error?.message || 'Neočekávaná chyba'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              <RefreshCw className="w-4 h-4" />
              Zkusit znovu
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
