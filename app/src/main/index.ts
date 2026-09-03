import { app, dialog, ipcMain, session, shell, BrowserWindow } from 'electron';
import { hostname, userInfo } from 'node:os';
import { join } from 'node:path';
import { rutaPlantillas } from './infraestructura/documental/excel/entregarPlantilla';
import { crearVentanaPrincipal, enfocarVentanaPrincipal } from './ventanas/ventanaPrincipal';
import { endurecerApp, denegarPermisos } from './seguridad/endurecerApp';
import { arrancar } from './arranque';
import { asegurarInstanciaUnica } from './arranque/instanciaUnica';
import { ejecutarComando } from './arranque/ejecutar';
import { leerArgumento } from './arranque/rutaDatos';
import { crearBitacora } from './infraestructura/bitacora/registrador';
import { crearRegistroIpc, GestorTareas, registrarTodosLosHandlers } from './ipc';

/** Qué ve el usuario en el diálogo de guardado, según la extensión sugerida. */
const NOMBRE_FORMATO: Readonly<Record<string, string>> = {
  xlsx: 'Libros de Excel',
  docx: 'Documentos de Word',
  pdf: 'Documentos PDF',
};

// `--user-data=<ruta>` aísla una instalación completa (pruebas E2E, portables). Debe ir antes de ready.
const userDataArg = leerArgumento(process.argv, 'user-data');
if (userDataArg !== undefined && userDataArg !== '') app.setPath('userData', userDataArg);

endurecerApp(app, process.env['ELECTRON_RENDERER_URL']);

if (!asegurarInstanciaUnica(app, enfocarVentanaPrincipal)) {
  app.quit();
} else {
  void app.whenReady().then(async () => {
    denegarPermisos(session.defaultSession);

    const ahora = (): Date => new Date();
    const resultado = await arrancar({
      argv: process.argv,
      env: process.env,
      plataforma: process.platform,
      userData: app.getPath('userData'),
      versionApp: app.getVersion(),
      ahora,
      ejecutar: ejecutarComando,
      mostrarBloqueo: (titulo, mensaje) => {
        // En pruebas automatizadas el diálogo modal bloquearía el proceso; el registro conserva la evidencia.
        if (process.env['VALUACION_SIN_DIALOGO'] !== '1') dialog.showErrorBox(titulo, mensaje);
      },
    });

    if (resultado.estado === 'salir') {
      app.exit(resultado.codigo);
      return;
    }

    const { baseDatos, registro, rutaDatos, config } = resultado.contexto;
    const ahoraIso = (): string => ahora().toISOString();
    const registroIpc = crearRegistroIpc({
      receptor: ipcMain,
      registro,
      contexto: {
        sqlite: baseDatos.sqlite,
        db: baseDatos.db,
        bitacora: crearBitacora(baseDatos.sqlite, `${hostname()}/${userInfo().username}`, ahoraIso),
        ahoraIso,
        rutaDatos: rutaDatos.ruta,
        formatoFechaRegional: config.importacion.formatoFechaRegional,
        rutaPlantillas: rutaPlantillas(app.isPackaged, process.resourcesPath, app.getAppPath()),
        dialogos: {
          // P-1: el main obtiene la ruta del sistema operativo; nunca del renderer.
          elegirArchivoExcel: async (titulo) => {
            const r = await dialog.showOpenDialog({
              title: titulo,
              properties: ['openFile'],
              filters: [{ name: 'Libros de Excel', extensions: ['xlsx'] }],
            });
            return r.canceled ? null : (r.filePaths[0] ?? null);
          },
          elegirDondeGuardar: async (titulo, nombreSugerido) => {
            const extension = nombreSugerido.split('.').pop() ?? 'xlsx';
            const r = await dialog.showSaveDialog({
              title: titulo,
              defaultPath: join(app.getPath('documents'), nombreSugerido),
              filters: [{ name: NOMBRE_FORMATO[extension] ?? 'Archivo', extensions: [extension] }],
            });
            return r.canceled ? null : (r.filePath ?? null);
          },
          elegirCarpeta: async (titulo) => {
            const r = await dialog.showOpenDialog({ title: titulo, defaultPath: app.getPath('documents'), properties: ['openDirectory', 'createDirectory'] });
            return r.canceled ? null : (r.filePaths[0] ?? null);
          },
          revelarEnCarpeta: (ruta) => shell.showItemInFolder(ruta),
        },
      },
    });
    registrarTodosLosHandlers(registroIpc, {
      versionApp: app.getVersion(),
      tareas: new GestorTareas(),
      registrarErrorRenderer: (mensaje, datos) => registro.error(mensaje, datos),
      versiones: {
        electron: process.versions.electron ?? 'desconocida',
        chrome: process.versions.chrome ?? 'desconocida',
        node: process.versions.node ?? 'desconocida',
      },
    });
    registro.info('canales IPC registrados', { total: registroIpc.canalesRegistrados().length });

    crearVentanaPrincipal();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) crearVentanaPrincipal();
    });
  });
}

app.on('window-all-closed', () => {
  // Windows es la plataforma principal: cerrar la última ventana cierra la app.
  if (process.platform !== 'darwin') app.quit();
});
