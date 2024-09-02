// AngularComponent.ts
import { Component } from '@angular/core';
import { add, subtract, withLogging } from './moduleA';

@Component({
  selector: 'app-math-operations',
  template: `
    <div>
      <p>Result of addition: {{ additionResult }}</p>
      <p>Result of subtraction: {{ subtractionResult }}</p>
      <button (click)="performAddition()">Add</button>
      <button (click)="performSubtraction()">Subtract</button>
    </div>
  `,
})
export class MathOperationsComponent {
  additionResult = 0;
  subtractionResult = 0;

  performAddition() {
    this.additionResult = add(10, 5);
  }

  performSubtraction() {
    this.subtractionResult = subtract(10, 5);
  }
}
