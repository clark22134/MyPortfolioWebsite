import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { InteractiveProjectsComponent } from './interactive-projects.component';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

describe('InteractiveProjectsComponent', () => {
  let component: InteractiveProjectsComponent;
  let fixture: ComponentFixture<InteractiveProjectsComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['logout', 'isAuthenticated']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        InteractiveProjectsComponent,
        HttpClientTestingModule,
        RouterTestingModule,
        FormsModule
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    // Set up default return value for isAuthenticated
    authService.isAuthenticated.and.returnValue(false);
    
    fixture = TestBed.createComponent(InteractiveProjectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize projects array', () => {
    expect(component.projects).toBeDefined();
    expect(component.projects.length).toBeGreaterThan(0);
  });

  it('should initialize empty selectedFiles object', () => {
    expect(component.selectedFiles).toEqual({});
  });

  it('should initialize empty uploading object', () => {
    expect(component.uploading).toEqual({});
  });

  it('should initialize empty uploadStatus object', () => {
    expect(component.uploadStatus).toEqual({});
  });

  it('should initialize empty uploadedFiles object', () => {
    expect(component.uploadedFiles).toEqual({});
  });

  it('should render page header', () => {
    const headerElement = fixture.nativeElement.querySelector('.page-header');
    expect(headerElement).toBeTruthy();
  });

  it('should display title', () => {
    const titleElement = fixture.nativeElement.querySelector('h1');
    expect(titleElement).toBeTruthy();
    expect(titleElement.textContent).toContain('Interactive Projects Dashboard');
  });

  it('should render logout button', () => {
    const logoutButton = fixture.nativeElement.querySelector('.btn-logout');
    expect(logoutButton).toBeTruthy();
    expect(logoutButton.textContent).toContain('Logout');
  });

  it('should call logout when logout button is clicked', () => {
    component.logout();
    
    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should render project cards', () => {
    const projectCards = fixture.nativeElement.querySelectorAll('.project-card');
    expect(projectCards.length).toBe(component.projects.length);
  });

  it('should display project titles', () => {
    const projectTitles = fixture.nativeElement.querySelectorAll('.project-card h2');
    expect(projectTitles.length).toBeGreaterThan(0);
  });

  it('should display project descriptions', () => {
    const descriptions = fixture.nativeElement.querySelectorAll('.project-description');
    expect(descriptions.length).toBeGreaterThan(0);
  });

  it('should format file size correctly', () => {
    expect(component.formatFileSize(1024)).toBe('1 KB');
    expect(component.formatFileSize(1048576)).toBe('1 MB');
    expect(component.formatFileSize(500)).toBe('500 Bytes');
  });

  it('should handle file selection', () => {
    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const event = {
      target: {
        files: [file]
      }
    } as any;

    component.onFileSelected(event, 'data-processor');

    expect(component.selectedFiles['data-processor']).toBe(file);
  });

  it('should handle drag over event', () => {
    const mockElement = document.createElement('div');
    const event = new DragEvent('dragover');
    Object.defineProperty(event, 'currentTarget', { value: mockElement, configurable: true });
    spyOn(event, 'preventDefault');
    spyOn(event, 'stopPropagation');

    component.onDragOver(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(mockElement.classList.contains('drag-over')).toBe(true);
  });

  it('should handle drag leave event', () => {
    const mockElement = document.createElement('div');
    mockElement.classList.add('drag-over');
    const event = new DragEvent('dragleave');
    Object.defineProperty(event, 'currentTarget', { value: mockElement, configurable: true });
    spyOn(event, 'preventDefault');
    spyOn(event, 'stopPropagation');

    component.onDragLeave(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(mockElement.classList.contains('drag-over')).toBe(false);
  });

  it('should handle drop event', () => {
    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const mockElement = document.createElement('div');
    mockElement.classList.add('drag-over');
    
    const event = new DragEvent('drop');
    Object.defineProperty(event, 'currentTarget', { value: mockElement, configurable: true });
    Object.defineProperty(event, 'dataTransfer', {
      value: { files: [file] },
      configurable: true
    });
    spyOn(event, 'preventDefault');
    spyOn(event, 'stopPropagation');

    component.onDrop(event, 'data-processor');

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(mockElement.classList.contains('drag-over')).toBe(false);
    expect(component.selectedFiles['data-processor']).toBe(file);
  });

  it('should disable upload button when no file selected', () => {
    const projectId = component.projects[0].id;
    component.selectedFiles[projectId] = null as any;
    fixture.detectChanges();

    const uploadButton = fixture.nativeElement.querySelector('.btn-upload');
    expect(uploadButton.disabled).toBe(true);
  });

  it('should enable upload button when file is selected', () => {
    const projectId = component.projects[0].id;
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    component.selectedFiles[projectId] = file;
    fixture.detectChanges();

    const uploadButton = fixture.nativeElement.querySelector('.btn-upload');
    expect(uploadButton.disabled).toBe(false);
  });

  it('should set uploading status when uploading file', () => {
    const projectId = component.projects[0].id;
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    component.selectedFiles[projectId] = file;

    component.uploadFile(projectId);

    expect(component.uploading[projectId]).toBe(true);
  });

  it('should display upload button text as "Uploading..." when uploading', () => {
    const projectId = component.projects[0].id;
    component.uploading[projectId] = true;
    fixture.detectChanges();

    const uploadButton = fixture.nativeElement.querySelector('.btn-upload');
    expect(uploadButton.textContent).toContain('Uploading...');
  });

  it('should display upload button text as "Upload File" when not uploading', () => {
    const projectId = component.projects[0].id;
    component.uploading[projectId] = false;
    fixture.detectChanges();

    const uploadButton = fixture.nativeElement.querySelector('.btn-upload');
    expect(uploadButton.textContent).toContain('Upload File');
  });

  it('should display accepted file types', () => {
    const fileInfo = fixture.nativeElement.querySelectorAll('.file-info');
    expect(fileInfo.length).toBeGreaterThan(0);
  });

  it('should display max file size', () => {
    const fileInfo = fixture.nativeElement.querySelectorAll('.file-info');
    const maxSizeInfo = Array.from(fileInfo).find((el: any) => 
      el.textContent.includes('Max size:')
    );
    expect(maxSizeInfo).toBeTruthy();
  });

  it('should render upload area', () => {
    const uploadArea = fixture.nativeElement.querySelector('.upload-area');
    expect(uploadArea).toBeTruthy();
  });

  it('should show "No file selected" initially', () => {
    const uploadHint = fixture.nativeElement.querySelector('.upload-hint');
    expect(uploadHint.textContent).toContain('No file selected');
  });

  it('should show file name when file is selected', () => {
    const projectId = component.projects[0].id;
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    component.selectedFiles[projectId] = file;
    fixture.detectChanges();

    const uploadHint = fixture.nativeElement.querySelector('.upload-hint');
    expect(uploadHint.textContent).toContain('test.txt');
  });

  it('should display uploaded files section when files exist', () => {
    const projectId = component.projects[0].id;
    component.uploadedFiles[projectId] = [
      { name: 'file1.txt', uploadDate: new Date() }
    ];
    fixture.detectChanges();

    const uploadedFilesSection = fixture.nativeElement.querySelector('.uploaded-files');
    expect(uploadedFilesSection).toBeTruthy();
  });

  it('should not display uploaded files section when no files uploaded', () => {
    const projectId = component.projects[0].id;
    component.uploadedFiles[projectId] = [];
    fixture.detectChanges();

    const uploadedFilesSection = fixture.nativeElement.querySelector('.uploaded-files');
    expect(uploadedFilesSection).toBeFalsy();
  });
});
