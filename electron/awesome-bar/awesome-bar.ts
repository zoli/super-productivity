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
  console.log('showAwesomeBar()');

  if (promptWindow && promptWindow.isVisible()) {
    promptWindow.hide();
    console.log('hide');
  } else if (promptWindow) {
    promptWindow.show();
    console.log('show');
  } else {
    promptWindow = new BrowserWindow({
      // width: 540, height: 160,
      width: 540, height: 400,
      transparent: true,
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
      promptWindow.hide();
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
      // setTimeout(() => {
      //   if (promptWindow) {
      //     promptWindow.webContents.openDevTools();
      //   }
      // }, 2000);
    });
  }
};
