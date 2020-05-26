import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
import {combineLatest, Observable, of, ReplaySubject} from 'rxjs';
import {concatMap, distinctUntilChanged, filter, map, shareReplay, startWith, switchMap, take} from 'rxjs/operators';
import {GlobalConfigService} from '../../features/config/global-config.service';
import {SyncProvider} from './sync-provider';
import {DataInitService} from '../data-init/data-init.service';

// Weird view service
// TODO poor design, replace with something better
@Injectable({
  providedIn: 'root',
})
export class GlobalSyncService {
  private _isInitialSyncEnabled$: Observable<boolean> = this._dataInitService.isAllDataLoadedInitially$.pipe(
    switchMap(() => combineLatest([
        this._globalConfigService.googleDriveSyncCfg$.pipe(
          map(cfg => cfg && cfg.isEnabled && cfg.isLoadRemoteDataOnStartup && cfg.isAutoLogin),
        ),
        this._globalConfigService.isBlockstackEnabled$,
      ]).pipe(
      map(all => all.includes(true)),
      )
    ),
    distinctUntilChanged(),
  );

  // keep it super simple for now
  private _isInitialSyncDoneManual$ = new ReplaySubject<boolean>(1);

  private _isInitialSyncDone$: Observable<boolean> = this._isInitialSyncEnabled$.pipe(
    switchMap((isActive) => {
      return isActive
        ? this._isInitialSyncDoneManual$.asObservable()
        : of(true);
    }),
    startWith(false),
  );

  afterInitialSyncDoneAndDataLoadedInitially$: Observable<boolean> = this._isInitialSyncDone$.pipe(
    filter(isDone => isDone),
    take(1),
    // NOTE: just makes sense
    // should normally be already loaded, but if there is NO initial sync it makes sense to wait here
    concatMap(() => this._dataInitService.isAllDataLoadedInitially$),
    shareReplay(1),
  );

  constructor(
    private readonly _store: Store<any>,
    private readonly _globalConfigService: GlobalConfigService,
    private readonly _dataInitService: DataInitService,
  ) {
    this.afterInitialSyncDoneAndDataLoadedInitially$.subscribe((v) => console.log('afterInitialSyncDoneAndDataLoadedInitially$', v));

  }

  // tslint:disable-next-line
  setInitialSyncDone(val: boolean, syncProvider: SyncProvider) {
    this._isInitialSyncDoneManual$.next(val);
  }
}
