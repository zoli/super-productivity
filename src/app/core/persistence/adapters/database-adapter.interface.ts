export interface DataBaseAdapter {
  load(key: string): Promise<unknown>;

  save(key: string, data: unknown): Promise<unknown>;

  remove(key: string): Promise<unknown>;

  clearDatabase(): Promise<unknown>;
}
