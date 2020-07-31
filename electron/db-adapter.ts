import promiseIpc from 'electron-promise-ipc';
import { promises as fs } from 'fs';
import { IPC } from './ipc-events.const';
import { app } from 'electron';

export const initDbAdapter = () => {
  const path = app.getPath('userData');
  console.log(promiseIpc);

  promiseIpc.on(IPC.DB_SAVE, (newSettings, event) => {
    console.log(newSettings);
    return fs.writeFile(path, newSettings);
  });
  // promiseIpc.on(IPC.DB_LOAD, (newSettings, event) => {
  //   return fs.writeFile(path, newSettings);
  // });
  // promiseIpc.on(IPC.DB_SAVE, (newSettings, event) => {
  //   return fs.writeFile(path, newSettings);
  // });
  // promiseIpc.on(IPC.DB_SAVE, (newSettings, event) => {
  //   return fs.writeFile(path, newSettings);
  // });
};
