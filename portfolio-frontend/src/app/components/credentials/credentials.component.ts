import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavComponent } from '../nav/nav.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-credentials',
  standalone: true,
  imports: [CommonModule, NavComponent],
  templateUrl: './credentials.component.html',
  styleUrl: './credentials.component.css'
})
export class CredentialsComponent {
  isAuthenticated = false;
  activeSection = 'resume';

  certifications = [
    { name: 'CompTIA Security+ CE', file: 'certs/CompTIA Security+ ce certificate.pdf' },
    { name: 'CompTIA PenTest+ CE', file: 'certs/CompTIA PenTest+ ce certificate.pdf' },
    { name: 'CompTIA CNVP', file: 'certs/CompTIA Network Vulnerability Assessment Professional - CNVP.pdf' },
    { name: 'eCTHP — Certified Threat Hunting Professional', file: 'certs/eCTHP.pdf' },
    { name: 'eCIR — Certified Incident Responder', file: 'certs/eCIR.pdf' },
    { name: 'eJPT — Junior Penetration Tester', file: 'certs/eJPT.pdf' },
  ];

  faaLicenses = [
    {
      title: 'Private Pilot',
      category: 'Pilot Certificate',
      details: [],
      icon: '🛩️'
    },
    {
      title: 'Commercial Pilot (Instrument Rated)',
      category: 'Pilot Certificate',
      details: ['ASEL — Airplane Single-Engine Land', 'AMEL — Airplane Multi-Engine Land'],
      icon: '✈️'
    },
    {
      title: 'Advanced Ground Instructor',
      category: 'Ground Instructor Certificate',
      details: [],
      icon: '📚'
    },
    {
      title: 'Instrument Ground Instructor',
      category: 'Ground Instructor Certificate',
      details: [],
      icon: '🧭'
    },
    {
      title: 'Certified Flight Instructor (CFI)',
      category: 'Flight Instructor Certificate',
      details: ['Recertification required'],
      icon: '👨‍✈️'
    },
    {
      title: 'Certified Flight Instructor — Instrument (CFII)',
      category: 'Flight Instructor Certificate',
      details: ['Recertification required'],
      icon: '🌐'
    },
    {
      title: 'Certified Flight Instructor — Multi-Engine Instrument (CFMEI)',
      category: 'Flight Instructor Certificate',
      details: ['Recertification required'],
      icon: '🔧'
    }
  ];

  experience = [
    {
      company: 'CGI Federal',
      title: 'Software Engineer / DevSecOps Lead',
      period: '2021 – Present',
      bullets: [
        'Engineered full-stack applications (Python, .NET, REST APIs, SQL) supporting large-scale federal data systems.',
        'Designed CI/CD pipelines (GitHub Actions) reducing deployment time by ~70% and increasing release frequency.',
        'Built ETL and data pipeline systems enabling real-time visibility into security and operational metrics (CDM program).',
        'Developed AI-powered analytics tools leveraging prompt engineering and LLMs to extract insights from large datasets.',
        'Integrated DevSecOps practices (automated security scanning, pipeline enforcement), improving compliance and reducing risk.',
        'Mentored engineers and interns, improving onboarding speed and team throughput.'
      ]
    },
    {
      company: 'CGI Federal',
      title: 'Software Engineering Intern',
      period: '2020',
      bullets: [
        'Delivered analytics strategy for Department of Veterans Affairs, influencing data-driven decision making.',
        'Optimized PowerShell automation scripts, improving operational efficiency.',
        'Worked within Agile/Scrum teams delivering iterative software improvements.'
      ]
    },
    {
      company: 'U.S. Marine Corps',
      title: 'Officer & NCO',
      period: '2007 – 2018',
      bullets: [
        'Led operations for teams of 700+ personnel in multinational environments.',
        'Managed logistics and accountability for assets exceeding $40M.',
        'Executed missions in high-stress environments requiring rapid decision-making and leadership.'
      ]
    }
  ];

  education = [
    { degree: 'B.S., Computer Science', school: 'Louisiana Tech University' },
    { degree: 'B.S., Professional Aviation', school: 'Louisiana Tech University' }
  ];

  technicalSkills = [
    { category: 'Languages', skills: 'Python, Java, C#, SQL, Bash, PowerShell, JavaScript' },
    { category: 'Frameworks', skills: '.NET, Spring Boot, Angular, React' },
    { category: 'Cloud', skills: 'AWS (EC2, S3, Lambda, Step Functions, ECS, Route 53, ACM, ECR, CloudWatch)' },
    { category: 'DevOps', skills: 'Docker, GitHub Actions, Jenkins, Terraform, Ansible' },
    { category: 'Data/AI', skills: 'Pandas, NumPy, Scikit-Learn, LangChain, HuggingFace' },
    { category: 'Practices', skills: 'CI/CD, DevSecOps, Microservices, TDD, REST APIs' }
  ];

  constructor(private authService: AuthService) {
    this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
    });
  }

  scrollToSection(section: string): void {
    this.activeSection = section;
    const el = document.getElementById(section);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
