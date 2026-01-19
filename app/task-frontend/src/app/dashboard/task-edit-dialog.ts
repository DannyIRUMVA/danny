import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Task } from '../services/task.service';

@Component({
  selector: 'app-task-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  template: `
    <h2 mat-dialog-title>Edit Task</h2>
    <div mat-dialog-content>
      <form class="dialog-form">
        <mat-form-field class="full">
          <mat-label>Title</mat-label>
          <input matInput [(ngModel)]="model.title" name="title">
        </mat-form-field>

        <mat-form-field class="full">
          <mat-label>Description</mat-label>
          <input matInput [(ngModel)]="model.description" name="description">
        </mat-form-field>

        <mat-form-field class="full">
          <mat-label>Status</mat-label>
          <mat-select [(ngModel)]="model.status" name="status">
            <mat-option value="Pending">Pending</mat-option>
            <mat-option value="In Progress">In Progress</mat-option>
            <mat-option value="Completed">Completed</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field class="full">
          <mat-label>Due date</mat-label>
          <input matInput [matDatepicker]="picker" [(ngModel)]="model.due_date" name="due_date">
          <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
        </mat-form-field>
      </form>
    </div>
    <div mat-dialog-actions>
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-flat-button color="primary" (click)="save()">Save</button>
    </div>
  `,
  styles: [`
    .full { width: 100%; }
    .dialog-form { display:flex; flex-direction:column; gap:12px; }
  `]
})
export class TaskEditDialogComponent {
  model: Task;

  constructor(
    public dialogRef: MatDialogRef<TaskEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Task
  ) {
    // clone the data to avoid mutating the array directly
    this.model = { ...data };
    if (this.model.due_date && typeof this.model.due_date === 'string') {
      // convert to Date for datepicker
      this.model.due_date = new Date(this.model.due_date as string);
    }
  }

  save() {
    this.dialogRef.close(this.model);
  }

  cancel() {
    this.dialogRef.close();
  }
}

