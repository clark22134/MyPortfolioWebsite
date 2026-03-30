import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TerminalLoaderService {
  private completeSubject = new BehaviorSubject<boolean>(false);
  complete$ = this.completeSubject.asObservable();

  get isComplete(): boolean {
    return this.completeSubject.value;
  }

  markComplete(): void {
    this.completeSubject.next(true);
  }
}
