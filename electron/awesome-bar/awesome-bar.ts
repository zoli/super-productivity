import {BrowserWindow, ipcMain} from 'electron';
import {join, normalize} from 'path';
import {format} from 'url';
import {IPC} from '../ipc-events.const';
import {getWin} from '../main-window';


let promptWindow: BrowserWindow;

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
    promptWindow = new BrowserWindow({
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

    promptWindow.on('closed', () => {
      promptWindow = null;
    });
    promptWindow.on('blur', () => {
      // promptWindow.hide();
    });

    // Load the HTML dialog box
    promptWindow.loadURL(format({
      // pathname: normalize(join(__dirname, '../dist/index.html')),
      pathname: normalize(join(__dirname, './awesome-bar.html')),
      protocol: 'file:',
      slashes: true,
    }));
    // promptWindow.setVisibleOnAllWorkspaces(true);

    promptWindow.once('ready-to-show', () => {
      promptWindow.show();
      requestData();
      setTimeout(() => requestData(), 500);
      setTimeout(() => requestData(), 1000);
      setTimeout(() => requestData(), 3000);
      setTimeout(() => requestData(), 4000);
      //   if (promptWindow) {
      //     promptWindow.webContents.openDevTools();
      //   }
      // }, 2000);
    });
  }
};
