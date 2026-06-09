import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { RealTimeAnalyticsComponent } from './real-time-analytics.component';

describe('RealTimeAnalyticsComponent', () => {
  let component: RealTimeAnalyticsComponent;
  let fixture: ComponentFixture<RealTimeAnalyticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RealTimeAnalyticsComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(RealTimeAnalyticsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders its template without errors', () => {
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.nativeElement).toBeTruthy();
  });
});
