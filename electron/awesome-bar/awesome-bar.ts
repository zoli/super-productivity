import {BrowserWindow, ipcMain} from 'electron';
import {join, normalize} from 'path';
import {format} from 'url';
import {IPC} from '../ipc-events.const';
import {getWin} from '../main-window';


let promptWindow;

// We need to forward the event
ipcMain.on(IPC.AWE_ADD_TASK, (ev, data) => {
  const mainWin = getWin();
  mainWin.webContents.send(IPC.AWE_ADD_TASK, data);
});
ipcMain.on(IPC.AWE_ADD_SUB_TASK, (ev, data) => {
  const mainWin = getWin();
  mainWin.webContents.send(IPC.AWE_ADD_SUB_TASK, data);
});
ipcMain.on(IPC.AWE_SELECT_TASK, (ev, data) => {
  const mainWin = getWin();
  mainWin.webContents.send(IPC.AWE_SELECT_TASK, data);
});
ipcMain.on(IPC.AWE_ADD_NOTE, (ev, data) => {
  const mainWin = getWin();
  mainWin.webContents.send(IPC.AWE_ADD_NOTE, data);
});


export const showAwesomeBar = () => {
  if (promptWindow) {
    promptWindow.close();
    return;
  }

  promptWindow = new BrowserWindow({
    width: 540, height: 160,
    // width: 540, height: 400,
    transparent: true,
    show: false,
    modal: false,
    frame: false,
    // center: true,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      sandbox: false
    }
  });
  promptWindow.on('closed', () => {
    promptWindow = null;
  });
  promptWindow.on('blur', () => {
    promptWindow.close();
  });

  // Load the HTML dialog box
  promptWindow.loadURL(join(__dirname, './awesome-bar.html'));
  promptWindow.loadURL(format({
    // pathname: normalize(join(__dirname, '../dist/index.html')),
    pathname: normalize(join(__dirname, './awesome-bar.html')),
    protocol: 'file:',
    slashes: true,
  }));

  promptWindow.once('ready-to-show', () => {
    promptWindow.show();
  });
};
