import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NavComponent } from '../nav/nav.component';

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
  imports: [CommonModule, FormsModule, NavComponent],
  template: `
    <app-nav></app-nav>

    <div class="interactive-projects-container">
      <!-- Cyber Logo -->
      <div class="cyber-logo">
        <div class="logo-icon">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <!-- Terminal window -->
            <rect x="10" y="20" width="80" height="60" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>
            <line x1="10" y1="30" x2="90" y2="30" stroke="currentColor" stroke-width="2"/>
            <!-- Terminal prompt -->
            <text x="18" y="48" font-family="monospace" font-size="12" fill="currentColor">&gt;_</text>
            <!-- Code lines -->
            <line x1="35" y1="45" x2="70" y2="45" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <line x1="35" y1="55" x2="60" y2="55" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <line x1="35" y1="65" x2="75" y2="65" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="logo-text">
          <span class="logo-prefix">{{ isAuthenticated ? 'root' : 'user' }}&#64;</span><span class="logo-host">portfolio</span>
        </div>
        <div class="scan-line"></div>
      </div>

      <h1>AI Projects Dashboard</h1>

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
      max-width: 1000px;
      margin: 0 auto;
      min-height: 100vh;
      background: #0a0a0a;
      padding: 0 2rem;
      position: relative;
    }

    .interactive-projects-container::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background:
        repeating-linear-gradient(
          0deg,
          rgba(0, 204, 51, 0.03) 0px,
          transparent 1px,
          transparent 2px,
          rgba(0, 204, 51, 0.03) 3px
        );
      pointer-events: none;
      z-index: 0;
    }

    /* Auth Button Styles */
    .auth-button {
      position: fixed;
      top: 20px;
      left: 160px;
      z-index: 1001;
      padding: 8px 16px;
      background: rgba(20, 20, 20, 0.85);
      border: 2px solid rgba(0, 204, 51, 0.4);
      border-radius: 6px;
      color: #00cc33;
      font-family: 'Courier New', monospace;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      backdrop-filter: blur(10px);
      box-shadow: 0 0 20px rgba(0, 204, 51, 0.2);
      transition: all 0.3s ease;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .auth-button:hover {
      border-color: rgba(0, 204, 51, 0.7);
      box-shadow: 0 0 30px rgba(0, 204, 51, 0.4);
      transform: translateY(-2px);
      background: rgba(0, 204, 51, 0.1);
    }

    /* Cyber Logo Styles */
    .cyber-logo {
      position: fixed;
      top: 20px;
      left: 20px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      padding: 8px;
      background: rgba(20, 20, 20, 0.85);
      border: 2px solid rgba(0, 204, 51, 0.4);
      border-radius: 8px;
      backdrop-filter: blur(10px);
      box-shadow:
        0 0 20px rgba(0, 204, 51, 0.2),
        inset 0 0 20px rgba(0, 204, 51, 0.05);
      transition: all 0.3s ease;
      overflow: hidden;
    }

    .cyber-logo:hover {
      border-color: rgba(0, 204, 51, 0.7);
      box-shadow:
        0 0 30px rgba(0, 204, 51, 0.4),
        inset 0 0 20px rgba(0, 204, 51, 0.1);
      transform: translateY(-2px);
    }

    .logo-icon {
      width: 38px;
      height: 38px;
      color: #00cc33;
      animation: pulse 3s ease-in-out infinite;
      filter: drop-shadow(0 0 8px rgba(0, 204, 51, 0.5));
    }

    .logo-icon svg {
      width: 100%;
      height: 100%;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        filter: drop-shadow(0 0 8px rgba(0, 204, 51, 0.5));
      }
      50% {
        opacity: 0.8;
        filter: drop-shadow(0 0 15px rgba(0, 204, 51, 0.7));
      }
    }

    .logo-text {
      font-family: 'Courier New', monospace;
      font-size: 0.68rem;
      color: #00cc33;
      text-shadow: 0 0 5px rgba(0, 204, 51, 0.5);
      letter-spacing: 1px;
    }

    .logo-prefix {
      color: #808080;
    }

    .logo-host {
      color: #00cc33;
      font-weight: 600;
    }

    .scan-line {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background: linear-gradient(90deg, transparent, #00cc33, transparent);
      animation: scanMove 2s linear infinite;
    }

    @keyframes scanMove {
      0% {
        transform: translateY(0);
        opacity: 0;
      }
      50% {
        opacity: 1;
      }
      100% {
        transform: translateY(-80px);
        opacity: 0;
      }
    }

    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 160px;
      margin-bottom: 3rem;
      position: relative;
      z-index: 1;
    }

    h1 {
      color: #00cc33;
      font-size: 2rem;
      text-align: left;
      margin: 0 0 3rem 0;
      margin-top: 160px;
      font-family: 'Courier New', 'Space Grotesk', monospace;
      letter-spacing: 2px;
      text-shadow:
        0 0 8px rgba(0, 204, 51, 0.4),
        0 0 15px rgba(0, 204, 51, 0.3);
    }

    .btn-logout {
      padding: 0.75rem 1.5rem;
      background: rgba(0, 204, 51, 0.2);
      color: #00cc33;
      border: 1px solid rgba(0, 204, 51, 0.5);
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      font-family: 'Courier New', monospace;
      letter-spacing: 1px;
      white-space: nowrap;
    }

    .btn-logout:hover {
      background: rgba(0, 204, 51, 0.3);
      border-color: #00cc33;
      transform: translateY(-2px);
      box-shadow: 0 0 15px rgba(0, 204, 51, 0.5);
    }

    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 2rem;
      position: relative;
      z-index: 1;
    }

    .project-card {
      background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      border: 1px solid rgba(0, 204, 51, 0.2);
      overflow: hidden;
    }

    .project-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: repeating-linear-gradient(
        0deg,
        rgba(0, 204, 51, 0.02) 0px,
        transparent 1px,
        transparent 2px,
        rgba(0, 204, 51, 0.02) 3px
      );
      pointer-events: none;
    }

    .project-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 12px 30px rgba(0, 204, 51, 0.3);
      border-color: rgba(0, 204, 51, 0.5);
    }

    .project-icon {
      font-size: 3rem;
      text-align: center;
      margin-bottom: 1rem;
    }

    h2 {
      color: #00cc33;
      margin: 0 0 1rem 0;
      font-size: 1.5rem;
      text-align: center;
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 600;
      text-shadow: 0 0 5px rgba(0, 204, 51, 0.3);
      position: relative;
      z-index: 1;
    }

    .project-description {
      color: #b0b0b0;
      margin-bottom: 1.5rem;
      line-height: 1.6;
      text-align: center;
      position: relative;
      z-index: 1;
    }

    .upload-section {
      margin-top: 1.5rem;
    }

    .file-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      padding: 0.5rem;
      background: rgba(0, 204, 51, 0.05);
      border-radius: 6px;
      border: 1px solid rgba(0, 204, 51, 0.2);
      position: relative;
      z-index: 1;
    }

    .file-info .label {
      font-weight: 600;
      color: #808080;
      font-family: 'Courier New', monospace;
    }

    .file-info .value {
      color: #00cc33;
      font-family: 'Courier New', monospace;
    }

    .upload-area {
      margin: 1rem 0;
      border: 2px dashed rgba(0, 204, 51, 0.3);
      border-radius: 8px;
      padding: 1rem;
      text-align: center;
      transition: all 0.3s;
      cursor: pointer;
      background: rgba(0, 204, 51, 0.03);
      position: relative;
      z-index: 1;
    }

    .upload-area:hover,
    .upload-area.drag-over {
      border-color: #00cc33;
      background: rgba(0, 204, 51, 0.1);
      box-shadow: 0 0 15px rgba(0, 204, 51, 0.2);
    }

    .upload-label {
      cursor: pointer;
      display: block;
    }

    .upload-icon {
      font-size: 2rem;
      margin-bottom: 0.25rem;
    }

    .upload-area p {
      margin: 0.25rem 0;
      color: #b0b0b0;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
    }

    .upload-hint {
      font-size: 0.8rem;
      color: #808080;
      font-style: italic;
      font-family: 'Courier New', monospace;
    }

    .btn-upload {
      width: 100%;
      padding: 0.75rem;
      background: rgba(0, 204, 51, 0.2);
      color: #00cc33;
      border: 1px solid rgba(0, 204, 51, 0.5);
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      margin-top: 1rem;
      font-family: 'Courier New', monospace;
      text-transform: uppercase;
      letter-spacing: 1px;
      position: relative;
      z-index: 1;
    }

    .btn-upload:hover:not(:disabled) {
      transform: translateY(-2px);
      background: rgba(0, 204, 51, 0.3);
      border-color: #00cc33;
      box-shadow: 0 0 15px rgba(0, 204, 51, 0.5);
    }

    .btn-upload:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      border-color: rgba(0, 204, 51, 0.2);
      color: rgba(0, 204, 51, 0.5);
    }

    .status-message {
      margin-top: 1rem;
      padding: 0.75rem;
      border-radius: 8px;
      text-align: center;
      font-weight: 500;
      font-family: 'Courier New', monospace;
      position: relative;
      z-index: 1;
    }

    .status-message.success {
      background: rgba(0, 204, 51, 0.2);
      color: #00cc33;
      border: 1px solid rgba(0, 204, 51, 0.4);
      box-shadow: 0 0 10px rgba(0, 204, 51, 0.2);
    }

    .status-message.error {
      background: rgba(204, 0, 51, 0.2);
      color: #ff3366;
      border: 1px solid rgba(204, 0, 51, 0.4);
      box-shadow: 0 0 10px rgba(204, 0, 51, 0.2);
    }

    .uploaded-files {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid rgba(0, 204, 51, 0.2);
      position: relative;
      z-index: 1;
    }

    .uploaded-files h3 {
      color: #00cc33;
      margin: 0 0 1rem 0;
      font-size: 1.1rem;
      font-family: 'Courier New', monospace;
      text-transform: uppercase;
      letter-spacing: 1px;
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
      background: rgba(0, 204, 51, 0.05);
      border-radius: 6px;
      margin-bottom: 0.5rem;
      border: 1px solid rgba(0, 204, 51, 0.2);
      transition: all 0.3s;
    }

    .uploaded-files li:hover {
      background: rgba(0, 204, 51, 0.1);
      border-color: rgba(0, 204, 51, 0.4);
    }

    .file-name {
      font-weight: 500;
      color: #00cc33;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: 'Courier New', monospace;
    }

    .file-date {
      font-size: 0.85rem;
      color: #808080;
      margin-left: 1rem;
      font-family: 'Courier New', monospace;
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
      id: 'rag-chatbot',
      title: 'RAG-Powered Chatbot',
      description: 'Upload documents to build a knowledge base for LLM-powered Q&A using Retrieval Augmented Generation with LangChain & vector databases',
      uploadTypes: ['.pdf', '.txt', '.doc', '.docx', '.md'],
      maxFileSize: 20 * 1024 * 1024 // 20MB
    },
    {
      id: 'multimodal-search',
      title: 'Multimodal Search Engine',
      description: 'Search across images and text using CLIP embeddings - query with text to find images or vice versa using OpenAI CLIP & FAISS',
      uploadTypes: ['.png', '.jpg', '.jpeg', '.webp', '.txt', '.json'],
      maxFileSize: 10 * 1024 * 1024 // 10MB
    },
    {
      id: 'ml-pipeline',
      title: 'ML Pipeline with MLOps',
      description: 'End-to-end machine learning pipeline with feature engineering, model training, versioning with MLflow, and automated deployment',
      uploadTypes: ['.csv', '.json', '.parquet', '.xlsx'],
      maxFileSize: 50 * 1024 * 1024 // 50MB
    },
    {
      id: 'fine-tuned-llm',
      title: 'Fine-Tuned LLM',
      description: 'Custom fine-tuned language model using LoRA/QLoRA on Hugging Face transformers - upload training data to create domain-specific models',
      uploadTypes: ['.jsonl', '.json', '.csv', '.txt'],
      maxFileSize: 25 * 1024 * 1024 // 25MB
    }
  ];

  selectedFiles: { [key: string]: File | null } = {};
  uploading: { [key: string]: boolean } = {};
  uploadStatus: { [key: string]: { type: string; message: string } } = {};
  uploadedFiles: { [key: string]: Array<{ name: string; uploadDate: Date }> } = {};
  isAuthenticated = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
      // If on this page and not authenticated, redirect
      if (!this.isAuthenticated && this.router.url.includes('/admin/interactive-projects')) {
        this.router.navigate(['/login']);
      }
    });
  }

  ngOnInit(): void {
    // Only redirect if not authenticated
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
