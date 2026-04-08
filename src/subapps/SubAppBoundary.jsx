import React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

class SubAppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: String(error?.message || 'Unknown error'),
    };
  }

  componentDidCatch(error, info) {
    console.error(`[SubApp:${this.props.moduleId}]`, error, info);
  }

  componentDidUpdate(prevProps) {
    if (!this.state.hasError) return;
    if (prevProps.resetKey === this.props.resetKey) return;

    this.setState({
      hasError: false,
      errorMessage: '',
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      errorMessage: '',
    });
  };

  render() {
    const { hasError, errorMessage } = this.state;
    if (!hasError) return this.props.children;

    const isDarkTheme = this.props.theme === 'dark';

    return (
      <div className={`rounded-3xl border px-5 py-6 text-center ${isDarkTheme ? 'border-rose-500/35 bg-slate-900/80' : 'border-rose-200 bg-rose-50/70'}`}>
        <div className={`mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl ${isDarkTheme ? 'bg-rose-500/20 text-rose-300' : 'bg-rose-100 text-rose-600'}`}>
          <AlertTriangle size={18} />
        </div>
        <h3 className={`syne text-lg font-bold ${isDarkTheme ? 'text-slate-100' : 'text-slate-800'}`}>
          Module temporarily unavailable
        </h3>
        <p className={`mt-2 text-sm ${isDarkTheme ? 'text-slate-300' : 'text-slate-600'}`}>
          This sub-app hit an error. Other modules remain stable.
        </p>
        {errorMessage && (
          <p className={`mt-2 text-xs ${isDarkTheme ? 'text-rose-300' : 'text-rose-600'}`}>
            {errorMessage}
          </p>
        )}
        <button
          type="button"
          onClick={this.handleRetry}
          className={`mt-4 inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold ${isDarkTheme ? 'border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
        >
          <RotateCw size={13} /> Retry module
        </button>
      </div>
    );
  }
}

export default function SubAppBoundary({ moduleId, theme = 'light', resetKey, children }) {
  return (
    <SubAppErrorBoundary moduleId={moduleId} theme={theme} resetKey={resetKey}>
      {children}
    </SubAppErrorBoundary>
  );
}
