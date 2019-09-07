import {BrowserWindow} from 'electron';
import {join} from 'path';

export const showAwesomeBar = () => {
  console.log('SHOW AWE');

  let promptWindow = new BrowserWindow({
    // width: 420, height: 120,
    width: 480, height: 420,
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
    // promptWindow.close();
  });
  console.log(promptWindow);

  // Load the HTML dialog box
  promptWindow.loadURL(join(__dirname, './awesome-bar.html'));

  promptWindow.once('ready-to-show', () => {
    console.log('READY');

    promptWindow.show();
  });
};
