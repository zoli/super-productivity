import { Injectable } from '@angular/core';
import { DataBaseAdapter } from './adapters/database-adapter.interface';
import { IndexedDbAdapter } from './adapters/indexed-db-adapter';

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  adapter: DataBaseAdapter = new IndexedDbAdapter();

  constructor() {
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
