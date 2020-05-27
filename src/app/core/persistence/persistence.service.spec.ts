import {TestBed} from '@angular/core/testing';
import {SnackService} from '../snack/snack.service';
import {DatabaseService} from './database.service';
import {CompressionService} from '../compression/compression.service';
import {PersistenceService} from './persistence.service';
import {TestScheduler} from 'rxjs/testing';
import {of} from 'rxjs';

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
      testScheduler.run((helpers) => {
        const FAKE_VAL: any = 'VVV';
        const a$ = of(FAKE_VAL);
        spyOn(PersistenceService.prototype, 'loadComplete').and.callFake(() => a$ as any);
        const service: PersistenceService = TestBed.get(PersistenceService);
        const t$ = service.inMemoryComplete$;
        const {cold, hot, expectObservable, flush, expectSubscriptions} = helpers;
        expectObservable(t$).toBe('a', {a: FAKE_VAL});
      });
    });

    // fit('AAA', () => {
    //   testScheduler.run((helpers) => {
    //     const FAKE_VAL: any = 'VVV';
    //     // PersistenceService.prototype.onAfterSave$ = new Subject();
    //     // spyOn(PersistenceService.prototype, 'loadComplete').and.callFake(() => Promise.resolve(FAKE_VAL));
    //     const a$ = of(FAKE_VAL);
    //     spyOn(PersistenceService.prototype, 'loadComplete').and.callFake(() => a$ as any);
    //
    //     const service: PersistenceService = TestBed.get(PersistenceService);
    //     const t$ = service.inMemoryComplete$;
    //     // service.onAfterSave$ = new Subject();
    //     // service.onAfterSave$.next('FAKE_VAL+2' as any);
    //     const {cold, hot, expectObservable, flush, expectSubscriptions} = helpers;
    //     console.log(service.inMemoryComplete$);
    //     // const e1 = cold('-a--b--c---|');
    //     // const subs = '^----------!';
    //     // const expected = '-a-';
    //     // const expected = 'a--b--c---|';
    //     const expected = 'a';
    //     const expectedVals = {a: FAKE_VAL};
    //     // service.inMemoryComplete$.subscribe((v) => console.log('sub1', v));
    //     // flush();
    //     // expectObservable(service.inMemoryComplete$.pipe(mapTo('XXX'))).toBe(expected);
    //     expectObservable(t$).toBe(expected, expectedVals);
    //   });
    // });
  });

  // it('AAA', () => {
  // });
});
