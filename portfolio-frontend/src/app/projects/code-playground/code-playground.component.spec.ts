import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CodePlaygroundComponent } from './code-playground.component';

describe('CodePlaygroundComponent', () => {
  let component: CodePlaygroundComponent;
  let fixture: ComponentFixture<CodePlaygroundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CodePlaygroundComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(CodePlaygroundComponent);
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
