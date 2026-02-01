import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface InteractiveProject {
  id: string;
  title: string;
  description: string;
  uploadTypes: string[];
  maxFileSize: number;
}

@Component({
  selector: 'app-interactive-projects',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="interactive-projects-container">
      <header class="page-header">
        <div class="header-content">
          <h1>Interactive Projects Dashboard</h1>
          <button class="btn-logout" (click)="logout()">Logout</button>
        </div>
      </header>

      <div class="projects-grid">
        <div *ngFor="let project of projects" class="project-card">
          <div class="project-icon">📁</div>
          <h2>{{ project.title }}</h2>
          <p class="project-description">{{ project.description }}</p>
          
          <div class="upload-section">
            <div class="file-info">
              <span class="label">Accepted types:</span>
              <span class="value">{{ project.uploadTypes.join(', ') }}</span>
            </div>
            <div class="file-info">
              <span class="label">Max size:</span>
              <span class="value">{{ formatFileSize(project.maxFileSize) }}</span>
            </div>
            
            <div class="upload-area" 
                 (dragover)="onDragOver($event)" 
                 (dragleave)="onDragLeave($event)"
                 (drop)="onDrop($event, project.id)">
              <input 
                type="file" 
                [id]="'file-' + project.id"
                [accept]="project.uploadTypes.join(',')"
                (change)="onFileSelected($event, project.id)"
                hidden
              >
              <label [for]="'file-' + project.id" class="upload-label">
                <div class="upload-icon">☁️</div>
                <p>Drag & drop files here or click to browse</p>
                <p class="upload-hint">{{ selectedFiles[project.id]?.name || 'No file selected' }}</p>
              </label>
            </div>
            
            <button 
              class="btn-upload" 
              [disabled]="!selectedFiles[project.id] || uploading[project.id]"
              (click)="uploadFile(project.id)">
              {{ uploading[project.id] ? 'Uploading...' : 'Upload File' }}
            </button>
            
            <div *ngIf="uploadStatus[project.id]" 
                 [class]="'status-message ' + uploadStatus[project.id].type">
              {{ uploadStatus[project.id].message }}
            </div>
          </div>

          <div *ngIf="uploadedFiles[project.id]?.length" class="uploaded-files">
            <h3>Recent Uploads</h3>
            <ul>
              <li *ngFor="let file of uploadedFiles[project.id]">
                <span class="file-name">{{ file.name }}</span>
                <span class="file-date">{{ file.uploadDate | date:'short' }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .interactive-projects-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
    }

    .page-header {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    h1 {
      color: #333;
      margin: 0;
      font-size: 2rem;
    }

    .btn-logout {
      padding: 0.75rem 1.5rem;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }

    .btn-logout:hover {
      background: #c82333;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
    }

    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 2rem;
    }

    .project-card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      transition: transform 0.3s;
    }

    .project-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 30px rgba(0,0,0,0.15);
    }

    .project-icon {
      font-size: 3rem;
      text-align: center;
      margin-bottom: 1rem;
    }

    h2 {
      color: #333;
      margin: 0 0 1rem 0;
      font-size: 1.5rem;
      text-align: center;
    }

    .project-description {
      color: #666;
      margin-bottom: 1.5rem;
      line-height: 1.6;
      text-align: center;
    }

    .upload-section {
      margin-top: 1.5rem;
    }

    .file-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      padding: 0.5rem;
      background: #f8f9fa;
      border-radius: 6px;
    }

    .file-info .label {
      font-weight: 600;
      color: #555;
    }

    .file-info .value {
      color: #667eea;
      font-family: monospace;
    }

    .upload-area {
      margin: 1rem 0;
      border: 2px dashed #ccc;
      border-radius: 8px;
      padding: 2rem;
      text-align: center;
      transition: all 0.3s;
      cursor: pointer;
    }

    .upload-area:hover,
    .upload-area.drag-over {
      border-color: #667eea;
      background: #f8f9ff;
    }

    .upload-label {
      cursor: pointer;
      display: block;
    }

    .upload-icon {
      font-size: 3rem;
      margin-bottom: 0.5rem;
    }

    .upload-area p {
      margin: 0.5rem 0;
      color: #666;
    }

    .upload-hint {
      font-size: 0.9rem;
      color: #999;
      font-style: italic;
    }

    .btn-upload {
      width: 100%;
      padding: 0.75rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      margin-top: 1rem;
    }

    .btn-upload:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-upload:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .status-message {
      margin-top: 1rem;
      padding: 0.75rem;
      border-radius: 8px;
      text-align: center;
      font-weight: 500;
    }

    .status-message.success {
      background: #d4edda;
      color: #155724;
    }

    .status-message.error {
      background: #f8d7da;
      color: #721c24;
    }

    .uploaded-files {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid #eee;
    }

    .uploaded-files h3 {
      color: #333;
      margin: 0 0 1rem 0;
      font-size: 1.1rem;
    }

    .uploaded-files ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .uploaded-files li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: #f8f9fa;
      border-radius: 6px;
      margin-bottom: 0.5rem;
    }

    .file-name {
      font-weight: 500;
      color: #333;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-date {
      font-size: 0.85rem;
      color: #999;
      margin-left: 1rem;
    }

    @media (max-width: 768px) {
      .projects-grid {
        grid-template-columns: 1fr;
      }

      .header-content {
        flex-direction: column;
        gap: 1rem;
      }

      h1 {
        font-size: 1.5rem;
      }
    }
  `]
})
export class InteractiveProjectsComponent implements OnInit {
  projects: InteractiveProject[] = [
    {
      id: 'data-processor',
      title: 'Data Processing Pipeline',
      description: 'Upload CSV or JSON files for automated data processing and analysis',
      uploadTypes: ['.csv', '.json', '.xlsx'],
      maxFileSize: 10 * 1024 * 1024 // 10MB
    },
    {
      id: 'image-converter',
      title: 'Image Format Converter',
      description: 'Convert images between different formats (PNG, JPEG, WebP)',
      uploadTypes: ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      maxFileSize: 5 * 1024 * 1024 // 5MB
    },
    {
      id: 'document-analyzer',
      title: 'Document Text Extractor',
      description: 'Extract and analyze text from PDF and Word documents',
      uploadTypes: ['.pdf', '.doc', '.docx', '.txt'],
      maxFileSize: 15 * 1024 * 1024 // 15MB
    },
    {
      id: 'code-formatter',
      title: 'Code Formatter & Linter',
      description: 'Format and lint code files for various programming languages',
      uploadTypes: ['.js', '.ts', '.java', '.py', '.html', '.css'],
      maxFileSize: 2 * 1024 * 1024 // 2MB
    }
  ];

  selectedFiles: { [key: string]: File | null } = {};
  uploading: { [key: string]: boolean } = {};
  uploadStatus: { [key: string]: { type: string; message: string } } = {};
  uploadedFiles: { [key: string]: Array<{ name: string; uploadDate: Date }> } = {};

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  onFileSelected(event: Event, projectId: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.validateAndSetFile(file, projectId);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).classList.add('drag-over');
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).classList.remove('drag-over');
  }

  onDrop(event: DragEvent, projectId: string): void {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).classList.remove('drag-over');
    
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.validateAndSetFile(file, projectId);
    }
  }

  validateAndSetFile(file: File, projectId: string): void {
    const project = this.projects.find((p: InteractiveProject) => p.id === projectId);
    if (!project) return;

    // Check file size
    if (file.size > project.maxFileSize) {
      this.uploadStatus[projectId] = {
        type: 'error',
        message: `File too large. Maximum size is ${this.formatFileSize(project.maxFileSize)}`
      };
      return;
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!project.uploadTypes.includes(fileExtension)) {
      this.uploadStatus[projectId] = {
        type: 'error',
        message: `Invalid file type. Accepted types: ${project.uploadTypes.join(', ')}`
      };
      return;
    }

    this.selectedFiles[projectId] = file;
    this.uploadStatus[projectId] = { type: '', message: '' };
  }

  uploadFile(projectId: string): void {
    const file = this.selectedFiles[projectId];
    if (!file) return;

    this.uploading[projectId] = true;
    this.uploadStatus[projectId] = { type: '', message: '' };

    // Simulate file upload (replace with actual API call)
    setTimeout(() => {
      this.uploading[projectId] = false;
      
      // Add to uploaded files list
      if (!this.uploadedFiles[projectId]) {
        this.uploadedFiles[projectId] = [];
      }
      this.uploadedFiles[projectId].unshift({
        name: file.name,
        uploadDate: new Date()
      });

      this.uploadStatus[projectId] = {
        type: 'success',
        message: `✓ ${file.name} uploaded successfully!`
      };

      // Clear selected file
      this.selectedFiles[projectId] = null;
      
      // Clear status after 3 seconds
      setTimeout(() => {
        this.uploadStatus[projectId] = { type: '', message: '' };
      }, 3000);
    }, 2000);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}
