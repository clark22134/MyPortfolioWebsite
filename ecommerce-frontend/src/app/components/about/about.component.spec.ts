import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AboutComponent } from './about.component';

describe('AboutComponent', () => {
  let component: AboutComponent;
  let fixture: ComponentFixture<AboutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AboutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the about page container', () => {
    const el = fixture.nativeElement.querySelector('.about-page');
    expect(el).toBeTruthy();
  });

  it('should render the hero title', () => {
    const title = fixture.nativeElement.querySelector('.hero-title');
    expect(title).toBeTruthy();
    expect(title.textContent).toContain('About Us');
  });

  it('should render about cards', () => {
    const cards = fixture.nativeElement.querySelectorAll('.about-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('should include portfolio credit card', () => {
    const cards = fixture.nativeElement.querySelectorAll('.about-card');
    const creditCard = Array.from(cards).find(
      (card: any) => card.textContent.includes('Clark Foster')
    );
    expect(creditCard).toBeTruthy();
  });
});
