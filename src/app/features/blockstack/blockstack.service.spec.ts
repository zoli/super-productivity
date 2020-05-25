import {TestBed} from '@angular/core/testing';

import {BlockstackService} from './blockstack.service';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {DEFAULT_APP_BASE_DATA} from '../../imex/sync/sync.model';
import {GlobalSyncService} from '../../core/global-sync/global-sync.service';
import {SnackService} from '../../core/snack/snack.service';
import {SyncService} from '../../imex/sync/sync.service';
import {GlobalProgressBarService} from '../../core-ui/global-progress-bar/global-progress-bar.service';
import {Subject} from 'rxjs';
import {AllowedDBKeys} from '../../core/persistence/ls-keys.const';

describe('BlockstackService', () => {
  let onSave$: Subject<{ appDataKey: AllowedDBKeys, data: any, isDataImport: boolean, projectId?: string }>;
  beforeEach(() => {
    onSave$ = new Subject();
    TestBed.configureTestingModule({
        providers: [
          {
            provide: PersistenceService, useValue: {
              loadComplete: () => DEFAULT_APP_BASE_DATA,
              getLastLocalSyncModelChange: () => Date.now(),
              onSave$
            },
          },
          {
            provide: GlobalSyncService, useValue: {
              setInitialSyncDone: () => false,
            },
          },
          {
            provide: SnackService, useValue: {
              open: () => false,
            },
          },
          {
            provide: SyncService, useValue: {
              importCompleteSyncData: () => false,
            },
          },
          {
            provide: GlobalProgressBarService, useValue: {
              countDown: () => false,
              countUp: () => false,
            },
          }
        ]
      }
    );
  });

  it('should be created', () => {
    const service: BlockstackService = TestBed.get(BlockstackService);
    expect(service).toBeTruthy();
  });

  // it('should xxx', () => {
  //   // const source = cold('-a-b-c-|', values);
  //   const expected = hot('-a-', {a: null});
  //   const service: BlockstackService = TestBed.get(BlockstackService);
  //   onSave$.next({appDataKey: 'tag', data: createEmptyEntity(), isDataImport: false});
  //   expect(service._allDataSaveTrigger$).toBeObservable(expected);
  // });
});
