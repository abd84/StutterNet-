import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught React error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-red-950/10 border border-red-500/20 rounded-xl max-w-2xl mx-auto my-8">
          <div className="bg-red-500/20 p-4 rounded-full mb-6">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Component Crashed</h2>
          <p className="text-red-300 text-center mb-6 max-w-md">
            The application encountered an unexpected error while trying to render this section. 
            We've logged the issue.
          </p>
          
          <div className="bg-black/40 p-4 rounded-md w-full mb-6 overflow-auto max-h-32 text-left">
            <code className="text-xs text-red-400 font-mono">
              {this.state.error?.toString()}
            </code>
          </div>

          <Button 
            variant="outline" 
            className="border-red-500/30 hover:bg-red-500/20 text-red-300"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
