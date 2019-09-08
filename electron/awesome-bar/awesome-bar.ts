import {BrowserWindow} from 'electron';
import {join, normalize} from 'path';
import {format} from 'url';

let promptWindow;

export const showAwesomeBar = () => {
  console.log('SHOW AWE');

  if (promptWindow) {
    promptWindow.show();
    return;
  }

  promptWindow = new BrowserWindow({
    // width: 540, height: 160,
    width: 540, height: 400,
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
    console.log('READY');

    promptWindow.show();
  });
};
