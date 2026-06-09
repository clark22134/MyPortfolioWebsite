import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AiChatbotComponent } from './ai-chatbot.component';

describe('AiChatbotComponent', () => {
  let component: AiChatbotComponent;
  let fixture: ComponentFixture<AiChatbotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiChatbotComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(AiChatbotComponent);
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
