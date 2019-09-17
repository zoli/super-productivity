import {app, BrowserWindow, ipcMain} from 'electron';
import {join, normalize} from 'path';
import {format} from 'url';
import {IPC} from '../ipc-events.const';
import {getWin} from '../main-window';


const createWin = (): BrowserWindow => {
  const win = new BrowserWindow({
    // width: 540, height: 160,
    width: 540, height: 100,
    // width: 540, height: 400,
    transparent: false,
    hasShadow: true,
    resizable: false,
    show: true,
    modal: true,
    frame: false,
    center: true,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      sandbox: false,
    }
  });
  win.on('closed', () => {
    promptWindow = null;
  });
  win.on('blur', () => {
    win.hide();
  });

  // Load the HTML dialog box
  win.loadURL(format({
    // pathname: normalize(join(__dirname, '../dist/index.html')),
    pathname: normalize(join(__dirname, './awesome-bar.html')),
    protocol: 'file:',
    slashes: true,
  }));
  win.hide();

  return win;
};
let promptWindow: BrowserWindow;

app.on('ready', () => promptWindow = createWin());

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

ipcMain.on(IPC.AWE_SENT_DATA, (ev, data) => {
  if (promptWindow) {
    promptWindow.webContents.send(IPC.AWE_SENT_DATA, data);
  }
});


const requestData = () => {
  const mainWin = getWin();
  mainWin.webContents.send(IPC.AWE_REQUEST_DATA);
};

export const showAwesomeBar = () => {
  if (promptWindow && promptWindow.isVisible()) {
    promptWindow.hide();
  } else if (promptWindow) {
    promptWindow.center();
    promptWindow.show();
    requestData();
  } else {
    promptWindow = createWin();
    promptWindow.once('ready-to-show', () => {
      promptWindow.show();
      requestData();
    });
  }
};
