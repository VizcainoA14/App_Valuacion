/**
 * TR-05 — generador de PDF (`T-G-03`).
 *
 * Se imprime desde una `BrowserWindow` **oculta** con `printToPDF`, que es el
 * motor de Chromium: el PDF sale exactamente igual que la vista previa, sin una
 * segunda maquetación que se desincronice con la de la aplicación.
 *
 * La ventana se crea sin Node y sin preload: el HTML del informe es de la
 * aplicación, pero cargarlo con privilegios sería regalar una superficie de
 * ataque a cambio de nada (R-02).
 */
import { BrowserWindow } from 'electron';
import { writeFileSync } from 'node:fs';

export interface OpcionesPdf {
  /** Encabezado y pie que Chromium imprime en cada página. */
  readonly encabezado?: string;
  readonly pie?: string;
}

/** Tamaño Carta, que es el estándar en Colombia (no A4). */
const PAGINA = 'Letter' as const;
const MARGENES_PULGADAS = { top: 0.6, bottom: 0.6, left: 0.5, right: 0.5 };

/**
 * Convierte un documento HTML completo en PDF. El HTML debe traer sus estilos
 * dentro: la ventana no carga nada de la red (no hay red que valga en una app
 * de escritorio sin conexión garantizada).
 */
export async function htmlAPdf(html: string, opciones: OpcionesPdf = {}): Promise<Buffer> {
  const ventana = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      // Sin JavaScript: el informe es contenido estático ya resuelto en el main.
      javascript: false,
      webSecurity: true,
      images: true,
    },
  });

  try {
    await ventana.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    return await ventana.webContents.printToPDF({
      pageSize: PAGINA,
      printBackground: true,
      margins: MARGENES_PULGADAS,
      displayHeaderFooter: opciones.encabezado !== undefined || opciones.pie !== undefined,
      ...(opciones.encabezado !== undefined ? { headerTemplate: opciones.encabezado } : {}),
      ...(opciones.pie !== undefined ? { footerTemplate: opciones.pie } : {}),
    });
  } finally {
    // Cerrar siempre: una ventana oculta huérfana mantiene viva la aplicación.
    ventana.destroy();
  }
}

export async function escribirPdf(html: string, destino: string, opciones: OpcionesPdf = {}): Promise<{ ruta: string; bytes: number }> {
  const pdf = await htmlAPdf(html, opciones);
  writeFileSync(destino, pdf);
  return { ruta: destino, bytes: pdf.byteLength };
}
