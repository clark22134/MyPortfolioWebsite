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
  templateUrl: './interactive-projects.component.html',
  styleUrl: './interactive-projects.component.css'
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
        this.router.navigate(['/login'], { replaceUrl: true });
      }
    });
  }

  ngOnInit(): void {
    // Only redirect if not authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { replaceUrl: true });
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
