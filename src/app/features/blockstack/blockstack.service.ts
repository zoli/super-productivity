import {Injectable} from '@angular/core';
import {AppConfig, UserSession} from 'blockstack';
import {auditTime, filter, map, mapTo, switchMap} from 'rxjs/operators';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {GlobalSyncService} from '../../core/global-sync/global-sync.service';
import {
  LS_GLOBAL_CFG,
  LS_PROJECT_META_LIST,
  LS_REMINDER,
  LS_SIMPLE_COUNTER_STATE,
  LS_TAG_STATE,
  LS_TASK_ARCHIVE,
  LS_TASK_REPEAT_CFG_STATE,
  LS_TASK_STATE
} from '../../core/persistence/ls-keys.const';
import {AppDataComplete} from '../../imex/sync/sync.model';
import {SyncService} from '../../imex/sync/sync.service';
import {ImexMetaService} from '../../imex/imex-meta/imex-meta.service';
import {from} from 'rxjs';

export const appConfig = new AppConfig(['store_write', 'publish_data']);

const PROPS_MAP: { [key: string]: keyof AppDataComplete } = {
  [LS_REMINDER]: 'reminders',
  [LS_TASK_ARCHIVE]: 'taskArchive',
  [LS_TASK_STATE]: 'task',
  [LS_TASK_REPEAT_CFG_STATE]: 'taskRepeatCfg',
  [LS_PROJECT_META_LIST]: 'project',
  [LS_TAG_STATE]: 'tag',
  [LS_SIMPLE_COUNTER_STATE]: 'simpleCounter',
  [LS_GLOBAL_CFG]: 'globalConfig',
  // TODO find solution for projct keys
};


// TODO improve
const COMPLETE_KEY = 'COMPLETE';

@Injectable({
  providedIn: 'root'
})
export class BlockstackService {
  us: UserSession = new UserSession({appConfig});

  private _inMemoryCopy;

  private _allData$ = this._persistenceService.onSave$.pipe(
    // tap(({key, isForce}) => console.log(key, isForce)),
    filter(({key, data, isForce}) => !!data && !isForce),
    switchMap(({key, data, isForce}) => from(this._getComplete()).pipe(
      map(complete => ({
        ...complete,
        [PROPS_MAP[key]]: data
      }))
    )),
  );
  private _allDataSave$ = this._allData$.pipe(
    switchMap(data => this._imexMetaService.isDataImportInProgress$.pipe(
      filter(isDataImportInProgress => !isDataImportInProgress),
      mapTo(data),
    )),
    auditTime(5000),
  );

  private _lastData: any;

  constructor(
    private _persistenceService: PersistenceService,
    private _globalSyncService: GlobalSyncService,
    private _imexMetaService: ImexMetaService,
    private _syncService: SyncService,
  ) {
    console.log(this.us.isUserSignedIn());


    if (this.us.isSignInPending()) {
      this.us.handlePendingSignIn().then((userData) => {
        // window.location = window.location.origin;
      });
    } else if (!this.us.isUserSignedIn()) {
      this.signIn();
    }
    // this.signIn();

    // SAVE TRIGGER TODO improve
    this._allDataSave$.subscribe(all => {
      console.log('_allDataSave$');
      this._write(COMPLETE_KEY, all);
    });

    // INITIAL LOAD TODO IMPROVE
    this.initialImport();
  }

  signIn() {
    this.us.redirectToSignIn();
  }

  signOut() {
    this.us.signUserOut(window.location.origin);
  }

  async initialImport() {
    const appComplete = await this._read(COMPLETE_KEY);
    console.log('INITIAL IMPORT', appComplete);
    await this._syncService.importCompleteSyncData(appComplete);
    console.log('INITIAL IMPORT => DONE');
  }

  async checkForUpdates() {
  }


  private async _getComplete(): Promise<AppDataComplete> {
    if (!this._inMemoryCopy) {
      await this._refreshInMemory();
    }
    return this._inMemoryCopy;
  }

  private async _refreshInMemory() {
    this._inMemoryCopy = await this._persistenceService.loadComplete();
  }

  private async _write(key: string, data: any): Promise<any> {
    if (!this.us.isUserSignedIn()) {
      return false;
    }

    // TODO do conflict resolution here
    await this._read(COMPLETE_KEY);

    const options = {encrypt: true};
    return this.us.putFile(key, JSON.stringify(data), options).catch(console.log);
  }

  private async _read(key: string): Promise<any> {
    if (!this.us.isUserSignedIn()) {
      return false;
    }
    const options = {decrypt: true};
    const data = await this.us.getFile(key, options);
    if (data) {
      return JSON.parse(data.toString());
    }
  }
}

