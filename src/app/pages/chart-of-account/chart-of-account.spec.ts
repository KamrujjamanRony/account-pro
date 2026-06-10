import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChartOfAccount } from './chart-of-account';

describe('ChartOfAccount', () => {
  let component: ChartOfAccount;
  let fixture: ComponentFixture<ChartOfAccount>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChartOfAccount],
    }).compileComponents();

    fixture = TestBed.createComponent(ChartOfAccount);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
