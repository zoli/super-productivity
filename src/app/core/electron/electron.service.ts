import { Injectable } from '@angular/core';
// If you import a module but never use any of the imported values other than as TypeScript types,
// the resulting javascript file will look as if you never imported the module at all.
import { ipcRenderer, remote, shell, webFrame } from 'electron';
import { IS_ELECTRON } from '../../app.constants';

// TODO make available for both
export const getSendChannel = channel => `%better-ipc-send-channel-${channel}`;
const getUniqueId = () => `${Date.now()}-${Math.random()}`;

// const getRendererSendChannel = (windowId, channel) => `%better-ipc-send-channel-${windowId}-${channel}`;
const getResponseChannels = channel => {
  const id = getUniqueId();
  return {
    sendChannel: getSendChannel(channel),
    dataChannel: `%better-ipc-response-data-channel-${channel}-${id}`,
    errorChannel: `%better-ipc-response-error-channel-${channel}-${id}`
  };
};

@Injectable({providedIn: 'root'})
export class ElectronService {
  ipcRenderer?: typeof ipcRenderer;
  webFrame?: typeof webFrame;
  remote?: typeof remote;
  shell?: typeof shell;

  // fs: typeof fs;

  constructor() {
    // Conditional imports
    if (IS_ELECTRON) {
      const electron = window.require('electron');
      this.ipcRenderer = electron.ipcRenderer;
      this.webFrame = electron.webFrame;
      this.remote = electron.remote;
      this.shell = electron.shell;
    }

    // NOTE: useful in case we want to disable the node integration
    // NOTE: global-error-handler.class.ts also needs to be adjusted
    // this.ipcRenderer = {
    //   on: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => {
    //   },
    //   send: () => {
    //   }
    // };
    // this.webFrame = {
    //   setZoomFactor(factor: number): void {
    //   },
    //   getZoomFactor: () => 1
    // };
  }

  get isElectron(): boolean {
    return !!(window && window.process && window.process.type);
  }

  public get isElectronApp(): boolean {
    return !!window.navigator.userAgent.match(/Electron/);
  }

  // TODO move to a better place
  public get isMacOS(): boolean {
    return this.isElectronApp && this.process && this.process.platform === 'darwin';
  }

  public get process(): any {
    return this.remote ? this.remote.process : null;
  }


  public callMain(channel: string, data: unknown) {
    return new Promise((resolve, reject) => {
      const {sendChannel, dataChannel, errorChannel} = getResponseChannels(channel);

      const cleanup = () => {
        (this.ipcRenderer as typeof ipcRenderer).off(dataChannel, onData);
        (this.ipcRenderer as typeof ipcRenderer).off(errorChannel, onError);
      };

      const onData = (event, result) => {
        cleanup();
        resolve(result);
      };

      const onError = (event, error) => {
        cleanup();
        // reject(deserializeError(error));
        reject(error);
      };

      (this.ipcRenderer as typeof ipcRenderer).once(dataChannel, onData);
      (this.ipcRenderer as typeof ipcRenderer).once(errorChannel, onError);

      const completeData = {
        dataChannel,
        errorChannel,
        userData: data
      };

      (this.ipcRenderer as typeof ipcRenderer).send(sendChannel, completeData);
    });
  }
}
