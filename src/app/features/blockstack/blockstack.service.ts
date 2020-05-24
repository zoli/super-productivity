import {Injectable} from '@angular/core';
import {AppConfig, UserSession} from 'blockstack';
import {
  auditTime,
  concatMap,
  debounceTime,
  filter,
  first,
  map,
  mapTo,
  share,
  startWith,
  switchMap,
  tap, throttleTime
} from 'rxjs/operators';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {GlobalSyncService} from '../../core/global-sync/global-sync.service';
import {AppDataComplete} from '../../imex/sync/sync.model';
import {SyncService} from '../../imex/sync/sync.service';
import {ImexMetaService} from '../../imex/imex-meta/imex-meta.service';
import {BehaviorSubject, EMPTY, from, fromEvent, merge, Observable, timer} from 'rxjs';
import {AllowedDBKeys} from '../../core/persistence/ls-keys.const';
import {isOnline$} from '../../util/is-online';

export const appConfig = new AppConfig(['store_write', 'publish_data']);


// TODO improve
const COMPLETE_KEY = 'SP_CPL';
const BS_AUDIT_TIME = 5000;
const TRIGGER_FOCUS_AGAIN_TIMEOUT_DURATION = BS_AUDIT_TIME + 3000;

@Injectable({
  providedIn: 'root'
})
export class BlockstackService {
  isSyncEnabled$ = new BehaviorSubject(true);
  us: UserSession = new UserSession({appConfig});

  private _checkRemoteUpdateTriggers$: Observable<string> = this.isSyncEnabled$.pipe(
    switchMap((isEnabled) => isEnabled
      ? merge(
        fromEvent(window, 'focus').pipe(
          tap(() => console.log('focus ev')),
          switchMap((ev) => isOnline$.pipe(
            filter(isOnline => isOnline),
          )),
          switchMap(() => timer(TRIGGER_FOCUS_AGAIN_TIMEOUT_DURATION).pipe(
            mapTo('FOCUS DELAYED'),
            startWith('FOCUS') // until the timer fires, you'll have this value
          ))
        ),
        isOnline$.pipe(
          filter(isOnline => isOnline),
          mapTo('IS_ONLINE'),
        ),
      )
      : EMPTY),
    throttleTime(5000),
    tap((ev) => console.log('__TRIGGER SYNC__', ev))
  );

  private _inMemoryCopy;

  private _allDataSaveTrigger$: Observable<AppDataComplete> = this._persistenceService.onSave$.pipe(
    // tap(({appDataKey, isDataImport, data}) => console.log(appDataKey, isDataImport, data && data.ids)),
    filter(({appDataKey, data, isDataImport}) => !!data && !isDataImport),
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
    this._initialSignInAndImportIfEnabled();

    // SYNC
    this._checkRemoteUpdateTriggers$.subscribe(() => this._checkForUpdateAndImport());
  }

  signIn() {
    this.us.redirectToSignIn();
  }

  signOut() {
    this.us.signUserOut(window.location.origin);
  }

  private async _initialSignInAndImportIfEnabled() {
    const isEnabled = await this.isSyncEnabled$.pipe(first()).toPromise();
    if (!isEnabled) {
      return;
    }

    if (this.us.isSignInPending()) {
      this.us.handlePendingSignIn().then((userData) => {
        // window.location = window.location.origin;
        return this._checkForUpdateAndImport();
      });
    } else if (!this.us.isUserSignedIn()) {
      this.signIn();
    } else {
      await this._checkForUpdateAndImport();
    }
  }

  private async _importRemote(data?: AppDataComplete) {
    const appComplete = data || await this._read(COMPLETE_KEY);
    await this._syncService.importCompleteSyncData(appComplete);
    await this._refreshInMemory(appComplete);
  }

  private async _checkForUpdateAndImport({isHandleLocalIsNewer = false}: {
    isHandleLocalIsNewer?: boolean
  } = {}) {
    const remote = await this._read(COMPLETE_KEY);
    const local = await this._persistenceService.loadComplete();

    if (!remote || !local) {
      throw new Error('No data available');
    }
    console.log('isImport', local.lastLocalSyncModelChange < remote.lastLocalSyncModelChange,
      (local.lastLocalSyncModelChange - remote.lastLocalSyncModelChange) / 1000,
      local.lastLocalSyncModelChange, remote.lastLocalSyncModelChange);

    if (local.lastLocalSyncModelChange === remote.lastLocalSyncModelChange) {
      console.log('NO UPDATE REQUIRED');
      // No update required
    } else if (local.lastLocalSyncModelChange > remote.lastLocalSyncModelChange) {
      if (isHandleLocalIsNewer && confirm('Local data is newer. Still import?')) {
        return await this._importRemote(remote);
      }
    } else if (local.lastLocalSyncModelChange < remote.lastLocalSyncModelChange) {
      return await this._importRemote(remote);
    }
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

  private async _refreshInMemory(data?: AppDataComplete) {
    this._inMemoryCopy = data || await this._persistenceService.loadComplete();
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

