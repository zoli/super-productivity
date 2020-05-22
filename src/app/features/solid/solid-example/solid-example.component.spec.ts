import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SolidExampleComponent } from './solid-example.component';

describe('SolidExampleComponent', () => {
  let component: SolidExampleComponent;
  let fixture: ComponentFixture<SolidExampleComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SolidExampleComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SolidExampleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
