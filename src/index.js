import React from 'react';
import ReactDOM from 'react-dom/client';
import './assets/styles/index.css';
import App from './app/App';
import reportWebVitals from './reportWebVitals';
import { ThemeProvider } from './app/providers/ThemeProvider';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
