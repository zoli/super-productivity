import {Injectable} from '@angular/core';
import {AppConfig, UserSession} from 'blockstack';
import {auditTime, filter, first, mapTo, skip, startWith, switchMap, tap, throttleTime} from 'rxjs/operators';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {GlobalSyncService} from '../../core/global-sync/global-sync.service';
import {AppDataComplete} from '../../imex/sync/sync.model';
import {SyncService} from '../../imex/sync/sync.service';
import {BehaviorSubject, EMPTY, fromEvent, merge, Observable, Subject, timer} from 'rxjs';
import {LS_BS_LAST_SYNC_TO_REMOTE} from '../../core/persistence/ls-keys.const';
import {isOnline$} from '../../util/is-online';
import {SyncProvider} from '../../core/global-sync/sync-provider';
import {SnackService} from '../../core/snack/snack.service';
import {isValidAppData} from '../../imex/sync/is-valid-app-data.util';
import {GlobalProgressBarService} from '../../core-ui/global-progress-bar/global-progress-bar.service';
import {GlobalConfigService} from '../config/global-config.service';
import {T} from '../../t.const';
import {checkForUpdate, UpdateCheckResult} from './check-for-update.util';

export const appConfig = new AppConfig(['store_write', 'publish_data']);


// TODO improve
const COMPLETE_KEY = 'SP_CPL';
const BS_AUDIT_TIME = 10000;
const TRIGGER_FOCUS_AGAIN_TIMEOUT_DURATION = BS_AUDIT_TIME + 3000;

@Injectable({
  providedIn: 'root'
})
export class BlockstackService {
  us: UserSession = new UserSession({appConfig});
  isSignedIn$ = new BehaviorSubject<boolean>(false);

  private _isEnabled$: Observable<boolean> = this._globalConfigService.isBlockstackEnabled$;
  // private _isEnabled$: Observable<boolean> = of(false);

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

  private _checkRemoteUpdate$: Observable<string> = this._isEnabled$.pipe(
    switchMap((isEnabled) => isEnabled
      ? this._checkRemoteUpdateTriggers$
      : EMPTY),
    throttleTime(5000),
    tap((ev) => console.log('__TRIGGER SYNC__', ev))
  );

  private _saveToRemoteTrigger$: Observable<AppDataComplete> = this._isEnabled$.pipe(
    switchMap((isEnabled) => isEnabled
      ? this._persistenceService.onAfterSave$
      : EMPTY),
    filter(({appDataKey, data, isDataImport}) => !!data && !isDataImport),
    switchMap(() => this._persistenceService.inMemoryComplete$),
  );

  private _manualSaveTrigger$ = new Subject<AppDataComplete>();
  private _writeAppDataToBlockstack$ = merge(
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
    this._saveToRemoteTrigger$
  ).pipe(
    auditTime(BS_AUDIT_TIME),
    switchMap(async (all) => {
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
    private _globalConfigService: GlobalConfigService,
    private _snackService: SnackService,
    private _syncService: SyncService,
    private _globalProgressBarService: GlobalProgressBarService,
  ) {
    // SAVE TRIGGER
    this._writeAppDataToBlockstack$.subscribe();

    // INITIAL LOAD AND SIGN IN
    this._initialSignInAndImportIfEnabled();

    // SYNC
    this._checkRemoteUpdate$.subscribe(() => this._checkForRemoteUpdateAndSync());
  }

  signIn() {
    this.us.redirectToSignIn();
  }

  signOut() {
    this.us.signUserOut(window.location.origin);
    // NOTE: if we don't next time we reload we will be logged in again
    this._globalConfigService.updateSection('blockstackSync', {
      isEnabled: false,
    });
    this.isSignedIn$.next(false);
  }

  private async _initialSignInAndImportIfEnabled() {
    if (await this._checkSetSignedIn()) {
      if (await this._isEnabled$.pipe(first()).toPromise()) {
        await this._checkForUpdateAndSyncInitial();
      } else {
        this._globalSyncService.setInitialSyncDone(true, SyncProvider.Blockstack);
      }
    } else {
      this.signIn();
      this.isSignedIn$.next(false);
    }
  }

  private async _checkSetSignedIn(): Promise<boolean> {
    if (this.us.isSignInPending()) {
      await this.us.handlePendingSignIn();
    }
    if (this.us.isUserSignedIn()) {
      this.isSignedIn$.next(true);
      this._snackService.open({msg: T.F.BLOCKSTACK.S.SIGNED_IN, type: 'SUCCESS'});
      return true;
    } else {
      this.isSignedIn$.next(false);
      return false;
    }
  }

  private async _importRemote(data?: AppDataComplete) {
    const appComplete = data || await this._read(COMPLETE_KEY);
    await this._syncService.importCompleteSyncData(appComplete);
    this._setLasSync(appComplete.lastLocalSyncModelChange);
  }

  private async _updateRemote(appComplete: AppDataComplete) {
    if (!appComplete) {
      throw new Error('No data provided');
    }

    // TODO maybe remove later on, when we are more sure about the data
    if (!isValidAppData(appComplete)) {
      throw new Error('Refused to update with invalid  data');
    }

    await this._write(COMPLETE_KEY, appComplete);
    this._setLasSync(appComplete.lastLocalSyncModelChange);
  }

  private async _checkForUpdateAndSyncInitial(params: {
    isManualHandleConflicts?: boolean
  } = {}) {
    // TODO i18n
    this._snackService.open({msg: T.F.BLOCKSTACK.S.LOAD, ico: 'file_download', isSpinner: true});
    return await this._checkForRemoteUpdateAndSync(params)
      .then(() => this._globalSyncService.setInitialSyncDone(true, SyncProvider.Blockstack))
      .catch(() => this._globalSyncService.setInitialSyncDone(true, SyncProvider.Blockstack));
  }

  private async _checkForRemoteUpdateAndSync({isManualHandleConflicts = false}: {
    isManualHandleConflicts?: boolean
  } = {}) {
    const remote = await this._read(COMPLETE_KEY);
    const local = await this._persistenceService.loadComplete();
    const lastSync = this._getLasSync();

    if (!remote || !local) {
      throw new Error('No data available');
    }
    // console.log('isImport', local.lastLocalSyncModelChange < remote.lastLocalSyncModelChange,
    //   (local.lastLocalSyncModelChange - remote.lastLocalSyncModelChange) / 1000,
    //   local.lastLocalSyncModelChange, remote.lastLocalSyncModelChange);

    switch (checkForUpdate({
      local: local.lastLocalSyncModelChange,
      lastSync,
      remote: remote.lastLocalSyncModelChange
    })) {
      case UpdateCheckResult.InSync: {
        console.log('BS: In Sync => No Update');
        break;
      }

      case UpdateCheckResult.LocalUpdateRequired: {
        console.log('BS: Update Local');
        return await this._importRemote(remote);
      }

      case UpdateCheckResult.RemoteUpdateRequired: {
        console.log('BS: Trigger Remote => nothing atm');
        this._manualSaveTrigger$.next(local);
        break;
      }

      case UpdateCheckResult.DataDiverged: {
        console.log('^--------^-------^');
        console.log('BS: X Diverged Data');
        alert('NO HANDLING YET');
        if (confirm('Import?')) {
          return await this._importRemote(remote);
        }
        break;
      }
    }
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

  // private _extendAppDataComplete({complete, appDataKey, projectId, data}: {
  //   complete: AppDataComplete,
  //   appDataKey: AllowedDBKeys,
  //   projectId?: string,
  //   data: any
  // }): AppDataComplete {
  //   // console.log(appDataKey, data && data.ids && data.ids.length);
  //   return {
  //     ...complete,
  //     ...(
  //       projectId
  //         ? {
  //           [appDataKey]: {
  //             ...(complete[appDataKey]),
  //             [projectId]: data
  //           }
  //         }
  //         : {[appDataKey]: data}
  //     )
  //   };
  // }

  private _getLasSync(): number {
    const la = localStorage.getItem(LS_BS_LAST_SYNC_TO_REMOTE);
    // NOTE: we need to parse because new Date('1570549698000') is "Invalid Date"
    return Number.isNaN(Number(la))
      ? null
      : +la;
  }

  private _setLasSync(date: number) {
    localStorage.setItem(LS_BS_LAST_SYNC_TO_REMOTE, date.toString());
  }
}

