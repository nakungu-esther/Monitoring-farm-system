import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { DAppKitProvider } from '@mysten/dapp-kit-react';
import { AgriTrackProvider } from './context/AgriTrackContext';
import { ToastProvider } from './context/ToastContext';
import { dAppKit } from './sui/dappKit';
import { initColorScheme } from './theme/initColorScheme';
import './i18n';
import App from './App';
import 'leaflet/dist/leaflet.css';
import './index.css';
import './styles.css';
import 'sweetalert2/dist/sweetalert2.min.css';

initColorScheme();

ReactDOM.createRoot(document.getElementById('root')).render(
  <div className="flex w-full min-w-0 flex-1 flex-col">
    <BrowserRouter>
      <DAppKitProvider dAppKit={dAppKit}>
        <AgriTrackProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AgriTrackProvider>
      </DAppKitProvider>
    </BrowserRouter>
  </div>
);
