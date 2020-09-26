import { Observable } from 'rxjs';
import { AppDataComplete } from '../../../imex/sync/sync.model';

export interface DataBaseAdapter {
  onChange$: Observable<AppDataComplete>

  load(key: string): Promise<unknown>;

  save(key: string, data: unknown): Promise<unknown>;

  remove(key: string): Promise<unknown>;

  clearDatabase(): Promise<unknown>;
}
