import { existsSync, mkdirSync, promises as fs } from 'fs';
import { IPC } from './ipc-events.const';
import { answerRenderer } from './better-ipc';

export const initDbAdapter = async (userDataDir: string) => {
  const basePath = `${userDataDir}/db`;
  if (!existsSync(basePath)) {
    mkdirSync(basePath);
  }

  console.log(basePath);

  answerRenderer(IPC.DB_SAVE, ({key, data}: { key: string; data: string }): Promise<void> => {
    console.log(key, data);
    return fs.writeFile(`${basePath}/${key}`, data);
  });

  answerRenderer(IPC.DB_LOAD, ({key}: { key: string }): Promise<string> => {
    return fs.readFile(`${basePath}/${key}`, 'utf8');
  });

  answerRenderer(IPC.DB_REMOVE, async ({key}: { key: string }): Promise<unknown> => {
    return fs.unlink(`${basePath}/${key}`);
  });

  answerRenderer(IPC.DB_CLEAR, async (): Promise<unknown> => {
    const fileNames: string[] = await fs.readdir(`${basePath}`);
    return Promise.all(fileNames.map(fileName => fs.unlink(`${basePath}/${fileName}`)));
  });
};
