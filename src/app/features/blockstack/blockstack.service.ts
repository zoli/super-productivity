import {Injectable} from '@angular/core';
import {AppConfig, UserSession} from 'blockstack';
import {auditTime, concatMap, filter, first, mapTo, skip, startWith, switchMap, take, tap} from 'rxjs/operators';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {GlobalSyncService} from '../../core/global-sync/global-sync.service';
import {AppDataComplete} from '../../imex/sync/sync.model';
import {SyncService} from '../../imex/sync/sync.service';
import {BehaviorSubject, EMPTY, fromEvent, merge, Observable, timer} from 'rxjs';
import {LS_BS_LAST_SYNC_TO_REMOTE} from '../../core/persistence/ls-keys.const';
import {isOnline$} from '../../util/is-online';
import {SyncProvider} from '../../core/global-sync/sync-provider';
import {SnackService} from '../../core/snack/snack.service';
import {isValidAppData} from '../../imex/sync/is-valid-app-data.util';
import {GlobalProgressBarService} from '../../core-ui/global-progress-bar/global-progress-bar.service';
import {GlobalConfigService} from '../config/global-config.service';
import {T} from '../../t.const';
import {checkForUpdate, UpdateCheckResult} from './check-for-update.util';
import {DataInitService} from '../../core/data-init/data-init.service';
import {IS_ELECTRON} from '../../app.constants';

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

  private _isEnabled$: Observable<boolean> = this._dataInitService.isAllDataLoadedInitially$.pipe(
    concatMap(() => this._globalConfigService.isBlockstackEnabled$),
  );


  // UPDATE LOCAL
  // ------------
  private _checkRemoteUpdateTriggers$: Observable<string> = merge(
    fromEvent(window, 'focus').pipe(
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


  // SAVE TO REMOTE
  // --------------
  private _saveToRemoteTrigger$: Observable<unknown> = this._persistenceService.onAfterSave$.pipe(
    filter(({appDataKey, data, isDataImport}) => !!data && !isDataImport),
  );

  private _sync$ = this._isEnabled$.pipe(
    switchMap((isEnabled) => isEnabled
      ? merge(
        this._checkRemoteUpdateTriggers$,
        this._saveToRemoteTrigger$,
      )
      : EMPTY),
    tap((ev) => console.log('__TRIGGER SYNC__', ev)),
    // TODO handle initial creation
    auditTime(BS_AUDIT_TIME),
    tap((ev) => console.log('__TRIGGER SYNC AFTER AUDITTIME__', ev)),
    switchMap(() => this._checkForRemoteUpdateAndSync()),
  );


  constructor(
    private _persistenceService: PersistenceService,
    private _dataInitService: DataInitService,
    private _globalSyncService: GlobalSyncService,
    private _globalConfigService: GlobalConfigService,
    private _snackService: SnackService,
    private _syncService: SyncService,
    private _globalProgressBarService: GlobalProgressBarService,
  ) {
    // INITIAL LOAD AND SIGN IN
    this._initialSignInAndImportIfEnabled();

    // SYNC
    this._sync$.subscribe();

    // TO RESET
    // this._persistenceService.inMemoryComplete$.pipe(take(1)).subscribe(data => this._updateRemote(data));
  }

  signIn() {
    console.log('window.location', window.location);
    if (confirm('Redirect for sign in?')) {
      if (IS_ELECTRON) {
        this.us.redirectToSignIn();
      } else {
        this.us.redirectToSignIn();
      }
    }
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
    if (await this._isEnabled$.pipe(first()).toPromise()) {
      if (await this._checkSetSignedIn()) {
        await this._checkForUpdateAndSyncInitial();
      } else {
        this.signIn();
        this.isSignedIn$.next(false);
      }
    } else {
      this._globalSyncService.setInitialSyncDone(true, SyncProvider.Blockstack);
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

  private async _importRemote(appComplete: AppDataComplete) {
    try {
      console.log(appComplete.lastLocalSyncModelChange);

      await this._syncService.importCompleteSyncData(appComplete);
      console.log('IMPORT', appComplete.lastLocalSyncModelChange);
      this._setLasSync(appComplete.lastLocalSyncModelChange);
      // this._persistenceService.updateLastLocalSyncModelChange(appComplete.lastLocalSyncModelChange);
    } catch (e) {
      this._snackService.open({type: 'ERROR', msg: T.F.BLOCKSTACK.S.ERROR_READ});
      console.error(e);
    }
  }

  private async _updateRemote(appComplete: AppDataComplete) {
    if (!appComplete) {
      throw new Error('No data provided');
    }

    // TODO maybe remove later on, when we are more sure about the data
    if (!isValidAppData(appComplete)) {
      throw new Error('Refused to update with invalid  data');
    }

    try {
      await this._write(COMPLETE_KEY, appComplete);
      console.log('WRITE', appComplete.lastLocalSyncModelChange);
      this._setLasSync(appComplete.lastLocalSyncModelChange);
      // this._persistenceService.updateLastLocalSyncModelChange(appComplete.lastLocalSyncModelChange);
    } catch (e) {
      this._snackService.open({type: 'ERROR', msg: T.F.BLOCKSTACK.S.ERROR_WRITE});
      console.error(e);
    }
  }

  private async _checkForUpdateAndSyncInitial() {
    this._snackService.open({msg: T.F.BLOCKSTACK.S.LOAD, ico: 'file_download', isSpinner: true});
    return await this._checkForRemoteUpdateAndSync().finally(
      () => this._globalSyncService.setInitialSyncDone(true, SyncProvider.Blockstack)
    );
  }

  private async _checkForRemoteUpdateAndSync() {
    const remote = await this._read(COMPLETE_KEY);
    const local = await this._persistenceService.inMemoryComplete$.pipe(take(1)).toPromise();
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
        console.log('BS: Remote Update Required => Update directly');
        return await this._updateRemote(local);
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

      case UpdateCheckResult.LastSyncNotUpToDate: {
        this._setLasSync(local.lastLocalSyncModelChange);
      }
    }
  }

  private async _write(key: string, data: AppDataComplete): Promise<any> {
    if (!this.us.isUserSignedIn()) {
      return false;
    }
    const options = {encrypt: true};

    this._globalProgressBarService.countUp();
    return this.us.putFile(key, JSON.stringify(data), options)
      .finally(() => this._globalProgressBarService.countDown());
  }

  private async _read(key: string): Promise<any> {
    if (!this.us.isUserSignedIn()) {
      return false;
    }
    const options = {decrypt: true};

    this._globalProgressBarService.countUp();
    const data = await this.us.getFile(key, options)
      .finally(() => this._globalProgressBarService.countDown());

    if (data) {
      return JSON.parse(data.toString());
    }
  }

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

