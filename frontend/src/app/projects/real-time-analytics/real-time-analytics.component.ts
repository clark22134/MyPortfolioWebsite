import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-real-time-analytics',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './real-time-analytics.component.html',
  styleUrl: './real-time-analytics.component.css'
})
export class RealTimeAnalyticsComponent {}
