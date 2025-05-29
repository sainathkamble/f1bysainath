import React from 'react';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
//import RecatDom from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './global.css'
import App from './App.jsx'
import { Provider } from 'react-redux';
import { store } from './redux/store.js';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <Provider store={store}> 
        <App />
      </Provider> 
    </HashRouter>
  </StrictMode>,
)
