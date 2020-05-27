import {TestBed} from '@angular/core/testing';
import {SnackService} from '../snack/snack.service';
import {DatabaseService} from './database.service';
import {CompressionService} from '../compression/compression.service';
import {PersistenceService} from './persistence.service';
import {TestScheduler} from 'rxjs/testing';
import {of} from 'rxjs';
import {createEmptyEntity} from '../../util/create-empty-entity';

const testScheduler = new TestScheduler((actual, expected) => {
  // asserting the two objects are equal
  expect(actual).toEqual(expected);
});


describe('PersistenceService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
        providers: [
          {
            provide: SnackService, useValue: {
              open: () => false,
            },
          },
          {
            provide: DatabaseService, useValue: {
              clearDatabase: () => false,
              save: () => false,
              remove: () => false,
              load: () => false,
            },
          },
          {
            provide: CompressionService, useValue: {
              decompress: () => false,
              compress: () => false,
            },
          },
        ]
      }
    );
  });

  describe('inMemoryComplete$', () => {
    it('should start with loadComplete data', () => {
      testScheduler.run(({expectObservable}) => {
        const FAKE_VAL: any = 'VVV';
        const a$ = of(FAKE_VAL);
        spyOn(PersistenceService.prototype, 'loadComplete').and.callFake(() => a$ as any);
        const service: PersistenceService = TestBed.get(PersistenceService);
        expectObservable(service.inMemoryComplete$).toBe('a', {a: FAKE_VAL});
      });
    });

    it('should database update should trigger onAfterSave$', (done) => {
      const service: PersistenceService = TestBed.get(PersistenceService);
      service.onAfterSave$.subscribe(({data}) => {
        expect(data).toEqual(createEmptyEntity());
        done();
      });
      service.tag.saveState(createEmptyEntity());
    });

    // fit('should update subject', (done) => {
    //   const FAKE_VAL: any = 'VVV';
    //   const service: PersistenceService = TestBed.get(PersistenceService);
    //
    //   let i = 0;
    //   service.onAfterSave$.subscribe((v) => {
    //     console.log(i, v);
    //     if (i === 2) {
    //       done();
    //     }
    //     i++;
    //   });
    //
    //   service.onAfterSave$.next(FAKE_VAL);
    //   service.onAfterSave$.next('FAKE_VAL 222' as any);
    //   service.onAfterSave$.next('FAKE_VAL 33333333333' as any);
    // });

    // fit('should update subject', () => {
    //   testScheduler.run(({expectObservable, expectSubscriptions, flush}) => {
    //     const FAKE_VAL: any = 'VVV';
    //     const service: PersistenceService = TestBed.get(PersistenceService);
    //     console.log(service.onAfterSave$);
    //     const t$ = service.onAfterSave$.asObservable();
    //     service.onAfterSave$.next(FAKE_VAL);
    //     service.onAfterSave$.subscribe((v) => console.log('', v));
    //     service.onAfterSave$.next('FAKE_VAL 222' as any);
    //     service.onAfterSave$.next('FAKE_VAL 33333333333' as any);
    //
    //     flush();
    //     expectObservable(t$).toBe('a', {a: FAKE_VAL});
    //   });
    // });

    // fit('AAA', () => {
    //   let nr = 0;
    //   testScheduler.run(({expectObservable, flush, cold}) => {
    //     const FAKE_VAL_INITIAL: any = 'VVV';
    //     const FAKE_CHANGED: any = 'DEFAULT_APP_BASE_DATA';
    //     // const FAKE_CHANGED: any = DEFAULT_APP_BASE_DATA;
    //     const a$ = of(FAKE_VAL_INITIAL);
    //     const b$ = of(FAKE_CHANGED);
    //
    //     spyOn(PersistenceService.prototype, 'loadComplete').and.callFake((): any => {
    //       console.log('CALL', nr);
    //       if (nr > 0) {
    //         nr++;
    //         return b$;
    //       } else {
    //         nr++;
    //         return a$;
    //       }
    //     });
    //     // PersistenceService.prototype.onAfterSave$ = cold('a-b-c-d') as any;
    //
    //     const service: PersistenceService = TestBed.get(PersistenceService);
    //     service.testUpdate();
    //     service.testUpdate();
    //     service.testUpdate();
    //
    //
    //     // service.onAfterSave$.next('some_change' as any);
    //     // setTimeout(() => {
    //     //   service.onAfterSave$.next('some_change 3' as any);
    //     // });
    //     //
    //     // service.inMemoryComplete$.subscribe();
    //     // service.onAfterSave$.subscribe();
    //     //
    //     // service.onAfterSave$.next('some_change2' as any);
    //     // PersistenceService.prototype.onAfterSave$.next('some change' as any);
    //     flush();
    //
    //     const expected = 'a-b';
    //     const expectedVals = {a: FAKE_VAL_INITIAL, b: FAKE_CHANGED};
    //     // const expected = 'b';
    //     // const expectedVals = {b: FAKE_CHANGED};
    //     expectObservable(service.inMemoryComplete$).toBe(expected, expectedVals);
    //   });
    // });
  });

  // it('AAA', () => {
  // });
});
