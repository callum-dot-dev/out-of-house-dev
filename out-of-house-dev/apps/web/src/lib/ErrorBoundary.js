import React from 'react';
import { Link } from 'react-router-dom';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    if (typeof window !== 'undefined' && window.__OOH_REPORT_ERROR__) {
      try { window.__OOH_REPORT_ERROR__(error, info); } catch (_) { /* ignore */ }
    }
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', error, info);
    }
  }

  reset = () => this.setState({ hasError: false, error: null, info: null });

  render() {
    if (!this.state.hasError) return this.props.children;
    const { fallback } = this.props;
    if (fallback) return fallback({ error: this.state.error, reset: this.reset });
    return (
      <div className="error-page">
        <div className="error-card">
          <div className="eyebrow">Something broke</div>
          <h1>This screen hit a snag.</h1>
          <p>
            The error has been logged. You can try reloading or head back to the dashboard.
          </p>
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <pre className="error-trace">{String(this.state.error?.stack || this.state.error?.message || this.state.error)}</pre>
          )}
          <div className="error-actions">
            <button type="button" className="primary-btn" onClick={() => window.location.reload()}>
              <span>Reload</span>
            </button>
            <Link to="/app"><button type="button" className="secondary-btn"><span>Back to dashboard</span></button></Link>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
