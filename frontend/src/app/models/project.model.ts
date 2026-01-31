export interface Project {
  id?: number;
  title: string;
  description: string;
  imageUrl?: string;
  githubUrl?: string;
  demoUrl?: string;
  technologies: string[];
  startDate?: string;
  endDate?: string;
  featured: boolean;
}
