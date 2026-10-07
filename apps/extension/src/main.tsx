import React, { Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

/** A rendering failure shows an explanation and a way out instead of a blank panel. */
class Crash extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main style={{ padding: '24px 16px', lineHeight: 1.6 }} role="alert">
        <h1 style={{ fontSize: 20 }}>Tranz gặp sự cố ngoài ý muốn</h1>
        <p>Nếu đang nghe cuộc họp, việc nghe vẫn tiếp tục; mở lại panel sẽ kết nối lại.</p>
        <p className="caption" style={{ overflowWrap: 'anywhere' }}>{this.state.error.message}</p>
        <button className="secondary" onClick={() => location.reload()}>
          Tải lại panel
        </button>
      </main>
    );
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Crash>
      <App />
    </Crash>
  </React.StrictMode>,
);
