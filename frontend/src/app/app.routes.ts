import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { ProjectsComponent } from './components/projects/projects.component';
import { InteractiveProjectsComponent } from './components/interactive-projects/interactive-projects.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'projects', component: ProjectsComponent },
  { path: 'admin/interactive-projects', component: InteractiveProjectsComponent },
  { path: '**', redirectTo: '' }
];
