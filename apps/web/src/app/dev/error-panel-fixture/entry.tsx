/**
 * @file app/dev/error-panel-fixture/entry.tsx
 * @description Development-only React entry for the /__test/error-panel
 * visual fixture, served by the Vite dev-server middleware registered in
 * vite.config.ts (command === 'serve' only). This module is never imported
 * by application code (App.tsx or the product router), so it is unreachable
 * from the production graph and Rollup emits no fixture route/module/chunk.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import '../../../index.css';
import ErrorPanelFixturePage from './page';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorPanelFixturePage />
    </React.StrictMode>,
  );
}
