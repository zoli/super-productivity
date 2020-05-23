import {Injectable} from '@angular/core';
import {AppConfig, UserSession} from 'blockstack';
import {auditTime, debounceTime, filter, map, retry, switchMap} from 'rxjs/operators';
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
import {from, Observable} from 'rxjs';

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
const BS_AUDIT_TIME = 5000;

@Injectable({
  providedIn: 'root'
})
export class BlockstackService {
  us: UserSession = new UserSession({appConfig});

  private _inMemoryCopy;

  private _allDataSaveTrigger$: Observable<AppDataComplete> = this._persistenceService.onSave$.pipe(
    // to always catch updates belonging together being fired at the same time
    // TODO race condition alert!!! we need to refactor how the persistence service works...
    debounceTime(99),
    // tap(({key, isDataImport}) => console.log(key, isDataImport)),
    filter(({dbKey, data, isDataImport}) => !!data && !isDataImport),
    switchMap(({dbKey, data, isDataImport}) => from(this._getAppDataCompleteWithLastSyncModelChange()).pipe(
      map(complete => ({
        ...complete,
        [PROPS_MAP[dbKey]]: data,
      }))
    )),
    auditTime(BS_AUDIT_TIME),
  );

  private _allDataWrite$ = this._allDataSaveTrigger$.pipe(
    switchMap(async (all) => {
      // TODO do conflict resolution here
      const remoteData = await this._read(COMPLETE_KEY);
      console.log('BS SAVE!! local/remote', all.lastLocalSyncModelChange, remoteData.lastLocalSyncModelChange);
      await this._write(COMPLETE_KEY, all);
    }),
    retry(1),
  );


  constructor(
    private _persistenceService: PersistenceService,
    private _globalSyncService: GlobalSyncService,
    private _imexMetaService: ImexMetaService,
    private _syncService: SyncService,
  ) {


    // SAVE TRIGGER
    this._allDataWrite$.subscribe();

    // INITIAL LOAD
    // TODO only do so if enabled in settings
    this._initialSignInAndImport().then();
  }

  signIn() {
    this.us.redirectToSignIn();
  }

  signOut() {
    this.us.signUserOut(window.location.origin);
  }

  private async _initialSignInAndImport() {
    if (this.us.isSignInPending()) {
      this.us.handlePendingSignIn().then((userData) => {
        // window.location = window.location.origin;
        return this._importRemote();
      });
    } else if (!this.us.isUserSignedIn()) {
      this.signIn();
    } else {
      await this._importRemote();
    }
  }

  private async _importRemote() {
    const appComplete = await this._read(COMPLETE_KEY);
    console.log('INITIAL IMPORT', appComplete);
    await this._syncService.importCompleteSyncData(appComplete);
  }

  private async _getAppDataCompleteWithLastSyncModelChange(): Promise<AppDataComplete> {
    if (!this._inMemoryCopy) {
      await this._refreshInMemory();
    }
    return {
      ...this._inMemoryCopy,
      lastLocalSyncModelChange: this._persistenceService.getLastLocalSyncModelChange(),
    };
  }

  private async _refreshInMemory() {
    this._inMemoryCopy = await this._persistenceService.loadComplete();
  }

  private async _write(key: string, data: AppDataComplete): Promise<any> {
    if (!this.us.isUserSignedIn()) {
      return false;
    }

    const options = {encrypt: true};
    return this.us.putFile(key, JSON.stringify(data), options).catch(console.log).then(console.log);
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

