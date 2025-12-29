import { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  widgetName: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Widget error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 flex flex-col items-center justify-center h-full">
          <AlertCircle className="w-8 h-8 text-amber-500 mb-3" />
          <p className="text-slate-700 font-medium mb-1">Widget Error</p>
          <p className="text-slate-500 text-sm text-center mb-3">
            Failed to load {this.props.widgetName}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-xs text-rocket-600 hover:text-rocket-700 hover:underline"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
