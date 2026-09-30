import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import App from './App';

/*
 * O reportWebVitals do Create React App foi removido: era chamado sem
 * argumento, por isso a sua própria guarda (`if (onPerfEntry instanceof
 * Function)`) impedia-o de correr, e usava a API v2 do web-vitals (getCLS,
 * getFID) que já não existe na v5 instalada. Ou seja: nunca mediu nada e
 * teria rebentado se alguma vez tivesse corrido.
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
