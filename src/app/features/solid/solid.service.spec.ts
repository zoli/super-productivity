import { TestBed } from '@angular/core/testing';

import { SolidService } from './solid.service';

describe('SolidService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: SolidService = TestBed.get(SolidService);
    expect(service).toBeTruthy();
  });
});
