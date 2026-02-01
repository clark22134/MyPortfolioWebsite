import { Component, OnInit, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="home-container">
      <!-- Animated Background -->
      <div class="animated-bg">
        <div class="circle circle-1"></div>
        <div class="circle circle-2"></div>
        <div class="circle circle-3"></div>
      </div>

      <section class="hero" [class.scrolled]="scrolled">
        <div class="hero-content fade-in">
          <h1 class="hero-title">Welcome to My Portfolio</h1>
          <p class="hero-subtitle">Full Stack Developer</p>
          <div class="hero-buttons">
            <a routerLink="/projects" class="btn btn-primary">View Projects</a>
            <a href="/resume.html" target="_blank" class="btn btn-secondary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              Resume
            </a>
            <a routerLink="/login" class="btn btn-outline">Login</a>
            <a href="https://github.com/clark22134" target="_blank" class="btn btn-outline">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              GitHub
            </a>
          </div>
        </div>
        <div class="scroll-indicator">
          <div class="mouse"></div>
        </div>
      </section>

      <section class="featured-projects" #projectsSection>
        <h2 class="section-title">Featured Projects</h2>
        <div class="projects-grid">
          <div *ngFor="let project of featuredProjects; let i = index" 
               class="project-card"
               [class.visible]="projectsVisible"
               [style.animation-delay]="i * 0.1 + 's'">
            <div class="card-glow"></div>
            <h3>{{ project.title }}</h3>
            <p>{{ project.description }}</p>
            <div class="technologies">
              <span *ngFor="let tech of project.technologies" class="tech-badge">{{ tech }}</span>
            </div>
            <div class="project-links">
              <a *ngIf="project.githubUrl" [href]="project.githubUrl" target="_blank" class="link">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                GitHub
              </a>
              <a *ngIf="project.demoUrl" [href]="project.demoUrl" target="_blank" class="link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                Live Demo
              </a>
            </div>
          </div>
        </div>
      </section>

      <section class="skills" #skillsSection [class.visible]="skillsVisible">
        <h2 class="section-title">Skills & Expertise</h2>
        <div class="skills-grid">
          <div class="skill-category" *ngFor="let category of skillCategories; let i = index" [style.animation-delay]="i * 0.1 + 's'">
            <div class="skill-icon">{{ category.icon }}</div>
            <h3>{{ category.title }}</h3>
            <div class="skill-items">
              <span *ngFor="let skill of category.skills" class="skill-tag">{{ skill }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="about" #aboutSection [class.visible]="aboutVisible">
        <h2 class="section-title">About This Portfolio</h2>
        <p>
          This portfolio website was built using the following technologies:
        </p>
        <ul>
          <li>Angular 19 with TypeScript</li>
          <li>Spring Boot 3.2.1 with Java 21 (LTS)</li>
          <li>RESTful API architecture</li>
          <li>JWT Authentication & Spring Security</li>
          <li>AWS ECS Fargate (Serverless Containers)</li>
          <li>AWS Application Load Balancer (ALB)</li>
          <li>AWS Route 53 (DNS Management)</li>
          <li>AWS Certificate Manager (ACM) with SSL/TLS</li>
          <li>AWS ECR (Container Registry)</li>
          <li>AWS CloudWatch (Logging & Monitoring)</li>
          <li>Terraform Infrastructure as Code</li>
          <li>Docker Multi-Stage Builds</li>
          <li>DevSecOps with GitHub Actions CI/CD</li>
        </ul>
      </section>
    </div>
  `,
  styles: [`
    .home-container {
      min-height: 100vh;
      position: relative;
      overflow-x: hidden;
    }

    /* Animated Background */
    .animated-bg {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      overflow: hidden;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    }

    .circle {
      position: absolute;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(79, 172, 254, 0.1) 0%, rgba(0, 242, 254, 0.1) 100%);
      animation: float 20s infinite ease-in-out;
    }

    .circle-1 {
      width: 300px;
      height: 300px;
      top: 10%;
      left: 10%;
      animation-delay: 0s;
    }

    .circle-2 {
      width: 200px;
      height: 200px;
      top: 60%;
      right: 10%;
      animation-delay: 7s;
    }

    .circle-3 {
      width: 250px;
      height: 250px;
      bottom: 10%;
      left: 50%;
      animation-delay: 14s;
    }

    @keyframes float {
      0%, 100% {
        transform: translate(0, 0) scale(1);
      }
      33% {
        transform: translate(30px, -30px) scale(1.1);
      }
      66% {
        transform: translate(-20px, 20px) scale(0.9);
      }
    }

    /* Fade-in animation */
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .fade-in {
      animation: fadeIn 1s ease-out;
    }

    .hero {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      color: white;
      padding: 6rem 2rem 4rem;
      text-align: center;
      position: relative;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      transition: transform 0.3s ease-out;
    }

    .hero.scrolled {
      transform: scale(0.95);
    }

    .hero-content {
      max-width: 800px;
      margin: 0 auto;
      z-index: 1;
    }

    .hero-title {
      font-size: 3.5rem;
      margin-bottom: 1rem;
      font-weight: 700;
      background: linear-gradient(to right, #fff, #e0f7ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: fadeIn 1s ease-out 0.2s both;
    }

    .hero-subtitle {
      font-size: 1.8rem;
      margin-bottom: 2rem;
      opacity: 0.95;
      animation: fadeIn 1s ease-out 0.4s both;
    }

    .hero-buttons {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
      animation: fadeIn 1s ease-out 0.6s both;
    }

    .btn {
      padding: 0.75rem 2rem;
      border-radius: 25px;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      position: relative;
      overflow: hidden;
    }

    .btn::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      transform: translate(-50%, -50%);
      transition: width 0.6s, height 0.6s;
    }

    .btn:hover::before {
      width: 300px;
      height: 300px;
    }

    .btn-primary {
      background: white;
      color: #4facfe;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 2px solid white;
      backdrop-filter: blur(10px);
    }

    .btn-outline {
      background: transparent;
      color: white;
      border: 2px solid white;
    }

    .btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.3);
    }

    .btn svg {
      position: relative;
      z-index: 1;
    }

    /* Scroll indicator */
    .scroll-indicator {
      position: absolute;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
      animation: bounce 2s infinite;
    }

    .mouse {
      width: 24px;
      height: 40px;
      border: 2px solid white;
      border-radius: 12px;
      position: relative;
    }

    .mouse::before {
      content: '';
      width: 4px;
      height: 8px;
      background: white;
      border-radius: 2px;
      position: absolute;
      top: 8px;
      left: 50%;
      transform: translateX(-50%);
      animation: scroll 2s infinite;
    }

    @keyframes bounce {
      0%, 20%, 50%, 80%, 100% {
        transform: translateX(-50%) translateY(0);
      }
      40% {
        transform: translateX(-50%) translateY(-10px);
      }
      60% {
        transform: translateX(-50%) translateY(-5px);
      }
    }

    @keyframes scroll {
      0% {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
      100% {
        opacity: 0;
        transform: translateX(-50%) translateY(12px);
      }
    }

    .featured-projects, .about {
      max-width: 1200px;
      margin: 4rem auto;
      padding: 0 2rem;
      position: relative;
      z-index: 1;
    }

    .section-title {
      font-size: 2.5rem;
      margin-bottom: 3rem;
      text-align: center;
      color: #333;
      position: relative;
      display: inline-block;
      left: 50%;
      transform: translateX(-50%);
    }

    .section-title::after {
      content: '';
      position: absolute;
      bottom: -10px;
      left: 0;
      width: 100%;
      height: 3px;
      background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
      border-radius: 2px;
    }

    h2 {
      font-size: 2.5rem;
      margin-bottom: 2rem;
      text-align: center;
      color: #333;
    }

    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 2rem;
      margin-top: 2rem;
    }

    .project-card {
      background: white;
      border-radius: 16px;
      padding: 2rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.07);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
      opacity: 0;
      transform: translateY(30px);
    }

    .project-card.visible {
      animation: slideUp 0.6s ease-out forwards;
    }

    @keyframes slideUp {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .card-glow {
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(79, 172, 254, 0.1) 0%, transparent 70%);
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
    }

    .project-card:hover .card-glow {
      opacity: 1;
    }

    .project-card:hover {
      transform: translateY(-8px) scale(1.02);
      box-shadow: 0 20px 40px rgba(79, 172, 254, 0.3);
    }

    .project-card h3 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: #4facfe;
      position: relative;
      z-index: 1;
      transition: color 0.3s;
    }

    .project-card:hover h3 {
      color: #00f2fe;
    }

    .project-card p {
      color: #666;
      margin-bottom: 1rem;
      line-height: 1.6;
      position: relative;
      z-index: 1;
    }

    .technologies {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
      position: relative;
      z-index: 1;
    }

    .tech-badge {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      padding: 0.4rem 0.9rem;
      border-radius: 12px;
      font-size: 0.875rem;
      color: #0369a1;
      font-weight: 500;
      transition: all 0.3s;
      border: 1px solid #bae6fd;
    }

    .tech-badge:hover {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(79, 172, 254, 0.3);
    }

    .project-links {
      display: flex;
      gap: 1rem;
      position: relative;
      z-index: 1;
    }

    .link {
      color: #4facfe;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.3s;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      border: 2px solid transparent;
    }

    .link:hover {
      color: #00f2fe;
      background: rgba(79, 172, 254, 0.1);
      border-color: #4facfe;
      transform: translateX(3px);
    }

    .link svg {
      transition: transform 0.3s;
    }

    .link:hover svg {
      transform: scale(1.1);
    }

    /* Skills Section */
    .skills {
      max-width: 1200px;
      margin: 6rem auto;
      padding: 0 2rem;
      position: relative;
      z-index: 1;
      opacity: 0;
      transform: translateY(30px);
      transition: all 0.8s ease-out;
    }

    .skills.visible {
      opacity: 1;
      transform: translateY(0);
    }

    .skills-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 2rem;
      margin-top: 3rem;
    }

    .skill-category {
      background: white;
      border-radius: 16px;
      padding: 2.5rem 2rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      text-align: center;
      opacity: 0;
      animation: skillSlideUp 0.6s ease-out forwards;
    }

    @keyframes skillSlideUp {
      to {
        opacity: 1;
      }
    }

    .skill-category:hover {
      transform: translateY(-8px);
      box-shadow: 0 12px 30px rgba(79, 172, 254, 0.2);
    }

    .skill-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      filter: grayscale(0.3);
      transition: all 0.3s;
    }

    .skill-category:hover .skill-icon {
      filter: grayscale(0);
      transform: scale(1.1);
    }

    .skill-category h3 {
      font-size: 1.5rem;
      margin-bottom: 1.5rem;
      color: #333;
      font-weight: 600;
    }

    .skill-items {
      display: flex;
      flex-wrap: wrap;
      gap: 0.6rem;
      justify-content: center;
    }

    .skill-tag {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.875rem;
      color: #0369a1;
      font-weight: 500;
      border: 1px solid #bae6fd;
      transition: all 0.3s;
    }

    .skill-tag:hover {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(79, 172, 254, 0.3);
    }

    .about {
      text-align: center;
      opacity: 0;
      transform: translateY(30px);
      transition: all 0.8s ease-out;
    }

    .about.visible {
      opacity: 1;
      transform: translateY(0);
    }

    .about p {
      font-size: 1.2rem;
      color: #666;
      margin-bottom: 2rem;
    }

    .about ul {
      list-style: none;
      padding: 0;
      display: inline-block;
      text-align: left;
      background: white;
      border-radius: 16px;
      padding: 2rem 3rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }

    .about li {
      font-size: 1.1rem;
      color: #333;
      margin: 1rem 0;
      padding-left: 2rem;
      position: relative;
      transition: all 0.3s;
    }

    .about li:hover {
      transform: translateX(5px);
      color: #4facfe;
    }

    .about li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #4facfe;
      font-weight: bold;
      font-size: 1.3rem;
      transition: transform 0.3s;
    }

    .about li:hover:before {
      transform: scale(1.2);
    }

    @media (max-width: 768px) {
      .hero-title {
        font-size: 2.5rem;
      }

      .hero-subtitle {
        font-size: 1.3rem;
      }

      .projects-grid {
        grid-template-columns: 1fr;
      }

      .section-title {
        font-size: 2rem;
      }

      .circle {
        display: none;
      }
    }
  `]
})
export class HomeComponent implements OnInit, AfterViewInit {
  featuredProjects: Project[] = [];
  scrolled = false;
  projectsVisible = false;
  skillsVisible = false;
  aboutVisible = false;

  skillCategories = [
    {
      icon: '💻',
      title: 'Frontend Development',
      skills: ['Angular', 'TypeScript', 'HTML/CSS', 'SCSS', 'Responsive Design']
    },
    {
      icon: '⚙️',
      title: 'Backend Development',
      skills: ['Java', 'Spring Boot', 'Spring Security', 'REST API', 'JWT']
    },
    {
      icon: '☁️',
      title: 'Cloud & DevOps',
      skills: ['AWS ECS', 'Docker', 'Terraform', 'GitHub Actions', 'CI/CD']
    },
    {
      icon: '🗄️',
      title: 'Database & Tools',
      skills: ['PostgreSQL', 'Git', 'Maven', 'Gradle', 'Postman']
    }
  ];

  constructor(private projectService: ProjectService) {}

  ngOnInit(): void {
    this.projectService.getFeaturedProjects().subscribe({
      next: (projects: Project[]) => this.featuredProjects = projects,
      error: (err: Error) => console.error('Error loading featured projects', err)
    });
  }

  ngAfterViewInit(): void {
    // Set up intersection observer for scroll animations
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
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

    // Observe sections
    setTimeout(() => {
      const projectsSection = document.querySelector('.featured-projects');
      const skillsSection = document.querySelector('.skills');
      const aboutSection = document.querySelector('.about');
      
      if (projectsSection) observer.observe(projectsSection);
      if (skillsSection) observer.observe(skillsSection);
      if (aboutSection) observer.observe(aboutSection);
    }, 100);
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.scrolled = window.scrollY > 50;
  }
}
