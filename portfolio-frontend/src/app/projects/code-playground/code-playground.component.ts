import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-code-playground',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './code-playground.component.html',
  styleUrl: './code-playground.component.css'
})
export class CodePlaygroundComponent {}
