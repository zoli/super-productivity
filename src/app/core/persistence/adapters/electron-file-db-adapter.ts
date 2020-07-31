import { Injectable } from '@angular/core';
import { DataBaseAdapter } from './database-adapter.interface';
import { ElectronService } from '../../electron/electron.service';
import { IpcRenderer } from 'electron';
import { IPC } from '../../../../../electron/ipc-events.const';
import promiseIpc from 'electron-promise-ipc';

@Injectable({
  providedIn: 'root',
})
export class ElectronFileDbAdapter implements DataBaseAdapter {
  ipcRenderer: IpcRenderer;

  constructor(
    private _electronService: ElectronService,
  ) {
    this.ipcRenderer = this._electronService.ipcRenderer as IpcRenderer;

  }

  async load(key: string): Promise<unknown> {
    return promiseIpc.send(IPC.DB_LOAD, {key} as any);
  }

  async save(key: string, data: unknown): Promise<unknown> {
    return promiseIpc.send(IPC.DB_SAVE, {key, data} as any);
  }

  async remove(key: string): Promise<unknown> {
    return promiseIpc.send(IPC.DB_REMOVE, {key} as any);
  }

  async clearDatabase(): Promise<unknown> {
    return promiseIpc.send(IPC.DB_CLEAR, undefined as any);
  }
}
