import { Injectable } from '@angular/core';
import { DataBaseAdapter } from './database-adapter.interface';
import { IPC } from '../../../../../electron/ipc-events.const';
import { ElectronService } from '../../electron/electron.service';

@Injectable({
  providedIn: 'root',
})
export class ElectronFileDbAdapter implements DataBaseAdapter {

  constructor(
    private _electronService: ElectronService,
  ) {
  }

  async load(key: string): Promise<unknown> {
    return this._electronService.callMain(IPC.DB_LOAD, {key} as any)
      .catch(e => {
        if (typeof e.toString === 'function' && e.toString().includes('ENOENT')) {
          return null;
        }
        throw new Error(e);
      })
      // .then((data) => JSON.parse(data as string))
      .then((data) => {
        console.log(data);
        if (data && (data as any).toString) {
          return JSON.parse((data as any).toString());
        }
        return null;
      });
  }

  async save(key: string, dataIn: unknown): Promise<unknown> {
    return this._electronService.callMain(IPC.DB_SAVE, {key, data: JSON.stringify(dataIn)} as any);
  }

  async remove(key: string): Promise<unknown> {
    return this._electronService.callMain(IPC.DB_REMOVE, {key} as any);
  }

  async clearDatabase(): Promise<unknown> {
    return this._electronService.callMain(IPC.DB_CLEAR, undefined as any);
  }
}
