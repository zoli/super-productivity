import {Injectable} from '@angular/core';
import {AppConfig, UserSession} from 'blockstack';
import {auditTime, concatMap, debounceTime, map, share, switchMap} from 'rxjs/operators';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {GlobalSyncService} from '../../core/global-sync/global-sync.service';
import {AppDataComplete} from '../../imex/sync/sync.model';
import {SyncService} from '../../imex/sync/sync.service';
import {ImexMetaService} from '../../imex/imex-meta/imex-meta.service';
import {from, Observable} from 'rxjs';
import {AllowedDBKeys} from '../../core/persistence/ls-keys.const';

export const appConfig = new AppConfig(['store_write', 'publish_data']);


// TODO improve
const COMPLETE_KEY = 'SP_CPL';
const BS_AUDIT_TIME = 5000;

@Injectable({
  providedIn: 'root'
})
export class BlockstackService {
  us: UserSession = new UserSession({appConfig});

  private _inMemoryCopy;

  private _allDataSaveTrigger$: Observable<AppDataComplete> = this._persistenceService.onSave$.pipe(
    // tap(({appDataKey, isDataImport, data}) => console.log(appDataKey, isDataImport, data && data.ids)),
    // filter(({appfDataKey, data, isDataImport}) => !!data && !isDataImport),
    concatMap(({appDataKey, data, isDataImport, projectId}) => from(this._getAppDataCompleteWithLastSyncModelChange()).pipe(
      // TODO fix error here
      map(complete => this._extendAppDataComplete({complete, appDataKey, projectId, data}))
    )),
    // NOTE: share is important here, because we're executing a side effect
    share(),
  );

  private _allDataWrite$ = this._allDataSaveTrigger$.pipe(
    // to always catch updates belonging together being fired at the same time
    // TODO race condition alert!!! we need to refactor how the persistence service works...
    debounceTime(99),
    auditTime(BS_AUDIT_TIME),
    switchMap(async (all) => {
      // TODO do conflict resolution here
      // TODO handle initial creation
      try {
        const remoteData = await this._read(COMPLETE_KEY);
        console.log('BS SAVE!! local/remote', all.lastLocalSyncModelChange, remoteData.lastLocalSyncModelChange);
        console.log(all, remoteData);
      } catch (e) {
        console.error(e);
      }

      return await this._write(COMPLETE_KEY, all);
    }),
    // retry(2),
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
    // return;
    if (this.us.isSignInPending()) {
      this.us.handlePendingSignIn().then((userData) => {
        if (confirm('Import data')) {
          this._initialSignInAndImport().then();
        }
      });
    } else if (!this.us.isUserSignedIn()) {
      this.signIn();
    } else {
      if (confirm('Import data')) {
        this._initialSignInAndImport().then();
      }
    }
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

  private async _importRemote(data?: AppDataComplete) {
    const appComplete = data || await this._read(COMPLETE_KEY);
    console.log('IMPORT', appComplete);
    await this._syncService.importCompleteSyncData(appComplete);
  }


  private async _getAppDataCompleteWithLastSyncModelChange(): Promise<AppDataComplete> {
    // TODO handle complete import etc
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
    const options = {encrypt: false};
    return this.us.putFile(key, JSON.stringify(data), options).catch(console.log).then(console.log);
  }

  private async _read(key: string): Promise<any> {
    if (!this.us.isUserSignedIn()) {
      return false;
    }
    const options = {decrypt: false};
    const data = await this.us.getFile(key, options);
    if (data) {
      return JSON.parse(data.toString());
    }
  }

  private _extendAppDataComplete({complete, appDataKey, projectId, data}: {
    complete: AppDataComplete,
    appDataKey: AllowedDBKeys,
    projectId?: string,
    data: any
  }): AppDataComplete {
    console.log(appDataKey, data && data.ids && data.ids.length);


    return {
      ...complete,
      ...(
        projectId
          ? {
            [appDataKey]: {
              ...(complete[appDataKey]),
              [projectId]: data
            }
          }
          : {[appDataKey]: data}
      )
    };
  }
}

