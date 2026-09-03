import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { aplicarApariencia, useEstadoInterfaz } from './app/estado';
import { vigilarErroresGlobales } from './app/LimiteError';
import './estilos/global.css';

const raiz = document.getElementById('raiz');
if (raiz === null) throw new Error('No existe el elemento #raiz');

// Apariencia antes del primer render: sin destello de tema equivocado.
const { tema, densidad } = useEstadoInterfaz.getState();
aplicarApariencia(tema, densidad);
vigilarErroresGlobales();

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
