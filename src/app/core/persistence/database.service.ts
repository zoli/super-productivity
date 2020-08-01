import { Injectable } from '@angular/core';
import { DataBaseAdapter } from './adapters/database-adapter.interface';
import { IndexedDbAdapter } from './adapters/indexed-db-adapter';
import { IS_ELECTRON } from '../../app.constants';
import { ElectronFileDbAdapter } from './adapters/electron-file-db-adapter';

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  adapter: DataBaseAdapter;

  constructor(
    private _indexedDbAdapter: IndexedDbAdapter,
    private _electronFileDbAdapter: ElectronFileDbAdapter,
  ) {
    if (IS_ELECTRON) {
      // TODO migrate for version
      this.adapter = this._electronFileDbAdapter;
    } else {
      this.adapter = this._indexedDbAdapter;
    }
  }

  async load(key: string): Promise<unknown> {
    return await (this.adapter).load(key);
  }

  async save(key: string, data: unknown): Promise<unknown> {
    return await (this.adapter).save(key, data);
  }

  async remove(key: string): Promise<unknown> {
    return await (this.adapter).remove(key);
  }

  async clearDatabase(): Promise<unknown> {
    return await (this.adapter).clearDatabase();
  }
}
