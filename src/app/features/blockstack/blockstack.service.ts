import {Injectable} from '@angular/core';
import {AppConfig, UserSession} from 'blockstack';
import {
  auditTime,
  concatMap,
  filter,
  first,
  map,
  mapTo,
  shareReplay,
  skip,
  skipWhile,
  startWith,
  switchMap,
  tap,
  throttleTime
} from 'rxjs/operators';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {GlobalSyncService} from '../../core/global-sync/global-sync.service';
import {AppDataComplete} from '../../imex/sync/sync.model';
import {SyncService} from '../../imex/sync/sync.service';
import {BehaviorSubject, EMPTY, from, fromEvent, merge, Observable, Subject, timer} from 'rxjs';
import {AllowedDBKeys, LS_BS_LAST_SYNC_TO_REMOTE} from '../../core/persistence/ls-keys.const';
import {isOnline$} from '../../util/is-online';
import {SyncProvider} from '../../core/global-sync/sync-provider';
import {SnackService} from '../../core/snack/snack.service';
import {isValidAppData} from '../../imex/sync/is-valid-app-data.util';
import {GlobalProgressBarService} from '../../core-ui/global-progress-bar/global-progress-bar.service';

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

  private _inMemoryCopy: AppDataComplete;

  private _checkRemoteUpdateTriggers$: Observable<string> = merge(
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
      // skip initial online which always fires on page load
      skip(1),
      filter(isOnline => isOnline),
      mapTo('IS_ONLINE'),
    ),
  );

  private _checkRemoteUpdate$: Observable<string> = this.isSyncEnabled$.pipe(
    switchMap((isEnabled) => isEnabled
      ? this._checkRemoteUpdateTriggers$
      : EMPTY),
    throttleTime(5000),
    tap((ev) => console.log('__TRIGGER SYNC__', ev))
  );


  private _allDataSaveTrigger$: Observable<AppDataComplete> = this._persistenceService.onSave$.pipe(
    // tap(({appDataKey, isDataImport, data}) => console.log(appDataKey, isDataImport, data && data.ids)),
    filter(({appDataKey, data, isDataImport}) => !!data && !isDataImport),
    concatMap(({appDataKey, data, isDataImport, projectId}) => from(this._getAppDataCompleteWithLastSyncModelChange()).pipe(
      // TODO handle side effect smarter
      map(complete => this._extendAppDataComplete({complete, appDataKey, projectId, data})),
      // tap(console.log)
    )),
    skipWhile(complete => !isValidAppData(complete)),
    // NOTE: share is important here, because we're executing a side effect
    // NOTE: share replay is required to make this work with manual save trigger
    shareReplay(1),
  );

  private _manualSaveTrigger$ = new Subject<AppDataComplete>();
  private _allDataWrite$ = merge(
    // TODO make this work somehow
    // this._manualSaveTrigger$.pipe(
    //   tap((data) => console.log('_manualSaveTrigger$', data)),
    //   switchMap((data) => merge(
    //     from(this._refreshInMemory()).pipe(mapTo(data)),
    //     this._allDataSaveTrigger$
    //   )),
    //   take(2),
    //   tap((data) => console.log('_manualSaveTrigger$ => _allDataSaveTrigger$', data)),
    // ),
    this._allDataSaveTrigger$
  ).pipe(
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
      await this._updateRemote(all);
    }),
    // retry(2),
  );


  constructor(
    private _persistenceService: PersistenceService,
    private _globalSyncService: GlobalSyncService,
    private _snackService: SnackService,
    private _syncService: SyncService,
    private _globalProgressBarService: GlobalProgressBarService,
  ) {
    // SAVE TRIGGER
    this._allDataWrite$.subscribe();

    // INITIAL LOAD
    this._initialSignInAndImportIfEnabled();

    // SYNC
    this._checkRemoteUpdate$.subscribe(() => this._checkForUpdateAndSync());
  }

  signIn() {
    this.us.redirectToSignIn();
  }

  signOut() {
    this.us.signUserOut(window.location.origin);
  }

  private async _initialSignInAndImportIfEnabled() {
    const isEnabled = await this.isSyncEnabled$.pipe(first()).toPromise();
    // this._globalSyncService.setInitialSyncDone(true, SyncProvider.Blockstack);
    // return;
    if (!isEnabled) {
      // TODO can normally be removed
      this._globalSyncService.setInitialSyncDone(true, SyncProvider.Blockstack);
      return;
    }

    if (this.us.isSignInPending()) {
      this.us.handlePendingSignIn().then((userData) => {
        // window.location = window.location.origin;
        return this._checkForUpdateAndSyncInitial();
      });
    } else if (!this.us.isUserSignedIn()) {
      this.signIn();
    } else {
      await this._checkForUpdateAndSyncInitial();
    }
  }

  private async _importRemote(data?: AppDataComplete) {
    const appComplete = data || await this._read(COMPLETE_KEY);
    await this._syncService.importCompleteSyncData(appComplete);
    await this._refreshInMemory(appComplete);
  }

  private async _updateRemote(appComplete: AppDataComplete) {
    console.log('xxxxxxxxxxxxxxxxxxxxxxxxxxx SAVE');

    if (!appComplete) {
      throw new Error('No data provided');
    }

    await this._write(COMPLETE_KEY, appComplete);
    await this._refreshInMemory(appComplete);
    this._setLasSyncTo(appComplete.lastLocalSyncModelChange);
  }

  private async _checkForUpdateAndSyncInitial(params: {
    isManualHandleConflicts?: boolean
  } = {}) {
    // TODO i18n
    this._snackService.open({msg: 'Loading data from Blockstack...'});
    return await this._checkForUpdateAndSync(params)
      .then(() => this._globalSyncService.setInitialSyncDone(true, SyncProvider.Blockstack))
      .catch(() => this._globalSyncService.setInitialSyncDone(true, SyncProvider.Blockstack));
  }

  private async _checkForUpdateAndSync({isManualHandleConflicts = false}: {
    isManualHandleConflicts?: boolean
  } = {}) {
    const remote = await this._read(COMPLETE_KEY);
    const local = await this._persistenceService.loadComplete();
    const lastSyncTo = this._getLasSyncTo();

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
      if (lastSyncTo < local.lastLocalSyncModelChange) {
        // alert('Update remote');
        console.log('UPDATE REMOTE INSTEAD');
        this._manualSaveTrigger$.next(local);
        // TODO snack
      } else if (isManualHandleConflicts) {
        if (lastSyncTo < remote.lastLocalSyncModelChange
          && confirm('Data has diverged. BETTER HANDLING')) {
          // return await this._updateRemote(local);
        } else if (isManualHandleConflicts
          && confirm('Local data is newer than remote. Still import?')) {
          return await this._importRemote(remote);
        }
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

    this._globalProgressBarService.countUp();
    return this.us.putFile(key, JSON.stringify(data), options)
      .catch(() => this._globalProgressBarService.countDown())
      .then(() => this._globalProgressBarService.countDown())
      ;
  }

  private async _read(key: string): Promise<any> {
    if (!this.us.isUserSignedIn()) {
      return false;
    }
    const options = {decrypt: false};

    this._globalProgressBarService.countUp();
    const data = await this.us.getFile(key, options)
      .catch(() => this._globalProgressBarService.countDown());
    this._globalProgressBarService.countDown();

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

  private _getLasSyncTo(): number {
    const la = localStorage.getItem(LS_BS_LAST_SYNC_TO_REMOTE);
    // NOTE: we need to parse because new Date('1570549698000') is "Invalid Date"
    return Number.isNaN(Number(la))
      ? null
      : +la;
  }

  private _setLasSyncTo(date: number) {
    localStorage.setItem(LS_BS_LAST_SYNC_TO_REMOTE, date.toString());
  }
}

