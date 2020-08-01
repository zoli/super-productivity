import { existsSync, mkdirSync, promises as fs } from 'fs';
import { IPC } from './ipc-events.const';
import { answerRenderer } from './better-ipc';

export const initDbAdapter = async (userDataDir: string) => {
  const basePath = `${userDataDir}/db`;
  if (!existsSync(basePath)) {
    mkdirSync(basePath);
  }

  console.log(basePath);

  answerRenderer(IPC.DB_SAVE, ({key, data}: { key: string; data: string }, event) => {
    console.log(key, data);
    return fs.writeFile(`${basePath}/${key}`, data);
  });

  answerRenderer(IPC.DB_LOAD, ({key}: { key: string }, event) => {
    return fs.readFile(`${basePath}/${key}`, 'utf8');
  });

  answerRenderer(IPC.DB_REMOVE, (newSettings, event) => {
    // console.log(newSettings, event);
    // return fs.writeFile(basePath, newSettings);
  });

  answerRenderer(IPC.DB_CLEAR, (params, event) => {
    // TODO delete all files in dir
    // return fs.writeFile(basePath);
  });
};
