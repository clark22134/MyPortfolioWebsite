import { environment } from './../../environments/environment.prod';
import { Component, OnInit, AfterViewInit, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.model';
import { NavComponent } from '../nav/nav.component';
import { AuthService } from '../../services/auth.service';
import { TerminalLoaderService } from '../../services/terminal-loader.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, NavComponent],

  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  featuredProjects: Project[] = [];
  scrolled = false;
  projectsVisible = false;
  skillsVisible = false;
  aboutVisible = false;
  typedText = '';
  isTyping = true;
  private fullText = 'WELCOME';
  private typingSpeed = 150;
  private terminalSub: Subscription | null = null;

  skillCategories = [
    {
      icon: '💻',
      title: 'Frontend Development',
      skills: ['Angular', 'TypeScript', 'HTML/CSS', 'SCSS', 'Responsive Design', 'WAI-ARIA 1.2']
    },
    {
      icon: '⚙️',
      title: 'Backend Development',
      skills: ['Java', 'Spring Boot', 'Spring Security', 'REST API', 'JWT']
    },
    {
      icon: '☁️',
      title: 'Cloud Infrastructure',
      skills: ['AWS S3', 'Route 53', 'ECS/Fargate', 'CloudWatch', 'EC2', 'Lambda', 'Terraform', 'ALB', 'ACM', 'ECR']
    },
    {
      icon: '🔧',
      title: 'DevSecOps & CI/CD',
      skills: ['GitHub Actions', 'SonarQube', 'Trivy', 'Docker', 'Linux/Windows', 'GitHub', 'Agile', 'axe-core']
    },
    {
      icon: '🤖',
      title: 'AI/ML',
      skills: ['Python (HuggingFace & LangChain)', 'LLMs', 'RAG', 'GitHub Copilot', 'IDP']
    },
    {
      icon: '🗄️',
      title: 'Database & Tools',
      skills: ['PostgreSQL', 'Git', 'Maven', 'Gradle', 'Postman']
    },
    {
      icon: '🔒',
      title: 'Cyber Security',
      skills: ['Network Penetration Testing', 'Host Penetration Testing', 'Threat Hunting', 'Incident Response', 'Digital Forensics']
    },
    {
      icon: '♿',
      title: 'Accessibility & Testing',
      skills: ['WCAG 2.1 AA', 'Section 508', 'Screen Reader Testing', 'axe-core / Puppeteer', 'Keyboard Navigation', 'ARIA Landmarks & Roles', 'Color Contrast Analysis', 'Web Speech API (TTS)']
    }
  ];

  isAuthenticated = false;

  constructor(
    private projectService: ProjectService,
    private authService: AuthService,
    private terminalLoaderService: TerminalLoaderService
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
    });
  }

  ngOnInit(): void {
    this.projectService.getFeaturedProjects().subscribe({
      next: (projects: Project[]) => this.featuredProjects = projects,
      error: (err: Error) => console.error('Error loading featured projects', err)
    });

    // Listen for the terminal animation to complete
    this.waitForTerminalComplete();
  }

  private waitForTerminalComplete(): void {
    const onComplete = () => {
      this.projectsVisible = true;
      this.skillsVisible = true;
      this.aboutVisible = true;
      setTimeout(() => this.typeText(), 100);
    };

    if (this.terminalLoaderService.isComplete) {
      onComplete();
    } else {
      this.terminalSub = this.terminalLoaderService.complete$.subscribe(complete => {
        if (complete) {
          onComplete();
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.terminalSub) {
      this.terminalSub.unsubscribe();
    }
  }

  private typeText(): void {
    let index = 0;
    const type = () => {
      if (index < this.fullText.length) {
        this.typedText += this.fullText.charAt(index);
        index++;
        setTimeout(type, this.typingSpeed);
      } else {
        this.isTyping = false;
      }
    };
    setTimeout(type, 500); // Delay before starting
  }

  ngAfterViewInit(): void {
    // Set up intersection observer for scroll animations
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (entry.target.classList.contains('featured-projects')) {
            this.projectsVisible = true;
          }
          if (entry.target.classList.contains('skills')) {
            this.skillsVisible = true;
          }
          if (entry.target.classList.contains('about')) {
            this.aboutVisible = true;
          }
        }
      });
    }, observerOptions);

    // Observe sections after a delay to ensure DOM is ready
    setTimeout(() => {
      const projectsSection = document.querySelector('.about-me');
      const skillsSection = document.querySelector('.skills');
      const aboutSection = document.querySelector('.about');

      if (projectsSection) observer.observe(projectsSection);
      if (skillsSection) observer.observe(skillsSection);
      if (aboutSection) observer.observe(aboutSection);

      // Fallback: make all sections visible after terminal animation
      // This ensures content shows even if IntersectionObserver has issues
      setTimeout(() => {
        this.projectsVisible = true;
        this.skillsVisible = true;
        this.aboutVisible = true;
      }, 6000); // After terminal animation completes (approx 5-6 seconds)
    }, 100);
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.scrolled = window.scrollY > 50;
  }
}
