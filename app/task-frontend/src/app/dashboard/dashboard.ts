import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

// Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu'; // Added for Dropdown
import { MatBadgeModule } from '@angular/material/badge'; // Added for Notifications
import { MatDividerModule } from '@angular/material/divider'; // Added for Menu separation

// Services & Components
import { TaskService, Task } from '../services/task.service';
import { TaskEditDialogComponent } from './task-edit-dialog';
import { UserService } from '../services/user.service';
import { SocketService } from '../services/socket.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    MatChipsModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatProgressBarModule,
    MatMenuModule,
    MatBadgeModule,
    MatDividerModule
  ],
  template: `
    <div class="dashboard-container">
      
      <!-- 1. Top Navigation Bar -->
      <nav class="top-nav">
        <div class="nav-left">
            <div class="logo-mark">
            <mat-icon>check_box</mat-icon>
          </div>
          <div>
            <h1>Task Management</h1>
            <p class="subtitle">{{ pendingCount() }} tasks pending</p>
          </div>
        </div>

        <div class="nav-right">
          <!-- Refresh Button -->
          <button mat-icon-button (click)="load()" [disabled]="isLoading()" matTooltip="Refresh Data">
            <mat-icon [class.spin]="isLoading()">sync</mat-icon>
          </button>

          <!-- Notifications -->
          <button mat-icon-button [matMenuTriggerFor]="notifMenu" class="notification-btn" matTooltip="Notifications"
                  [matBadge]="notificationCount()" matBadgeColor="warn" [matBadgeHidden]="notificationCount() === 0"
                  aria-label="Notifications">
            <mat-icon aria-hidden="false">notifications_none</mat-icon>
          </button>
          <mat-menu #notifMenu="matMenu">
            <ng-container *ngIf="notifications.length; else noNotifs">
              <button mat-menu-item *ngFor="let n of notifications">
                <div class="notif-item">
                  <div class="notif-title">{{ n.title || (n.task?.title) || 'Notification' }}</div>
                  <div class="notif-meta">{{ n.message || (n.task?.assigned_to_email) || '' }}</div>
                </div>
              </button>
              <mat-divider></mat-divider>
              <button mat-menu-item (click)="clearNotifications()">Clear notifications</button>
            </ng-container>
            <ng-template #noNotifs>
              <div class="empty-notif">No notifications</div>
            </ng-template>
          </mat-menu>

          <!-- Profile Avatar & Dropdown -->
          <button class="avatar-btn" [matMenuTriggerFor]="userMenu">
            <div class="avatar-circle">{{ (currentUser$ | async)?.initials || 'U' }}</div>
          </button>

          <mat-menu #userMenu="matMenu" xPosition="before" class="profile-menu">
            <div class="menu-header">
              <span class="font-bold">{{ (currentUser$ | async)?.displayName || 'Guest' }}</span>
              <span class="text-xs text-slate-500">{{ (currentUser$ | async)?.email || '' }}</span>
            </div>
            <mat-divider></mat-divider>
            <button mat-menu-item>
              <mat-icon>person_outline</mat-icon>
              <span>Profile</span>
            </button>
            <button mat-menu-item>
              <mat-icon>settings</mat-icon>
              <span>Settings</span>
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="logout()">
              <mat-icon color="warn">logout</mat-icon>
              <span class="text-red-600">Log out</span>
            </button>
          </mat-menu>
        </div>
      </nav>

      <!-- 2. Create Task Card -->
      <mat-card class="create-card">
        <mat-card-header>
          <mat-card-title>Quick Add Task</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="taskForm" (ngSubmit)="create()" class="create-form">
            
            <div class="form-row main-inputs">
              <mat-form-field appearance="outline" class="flex-grow">
                <mat-label>What needs to be done?</mat-label>
                <input matInput formControlName="title" placeholder="e.g., Review Q3 Reports">
              </mat-form-field>

              <mat-form-field appearance="outline" class="status-select">
                <mat-label>Status</mat-label>
                <mat-select formControlName="status">
                  <mat-option value="Pending">Pending</mat-option>
                  <mat-option value="In Progress">In Progress</mat-option>
                  <mat-option value="Completed">Completed</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="form-row secondary-inputs">
              <mat-form-field appearance="outline" class="flex-grow">
                <mat-label>Description (Optional)</mat-label>
                <input matInput formControlName="description" placeholder="Add details...">
              </mat-form-field>

              <mat-form-field appearance="outline" class="date-select">
                <mat-label>Due Date</mat-label>
                <input matInput [matDatepicker]="picker" formControlName="due_date">
                <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
                <mat-datepicker #picker></mat-datepicker>
              </mat-form-field>

              <button mat-flat-button color="primary" type="submit" 
                      [disabled]="taskForm.invalid || isLoading()" class="add-btn">
                <mat-icon>add</mat-icon> Add
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- 3. Filters -->
      <div class="filter-bar">
        <mat-chip-listbox aria-label="Filter tasks" [value]="filterSignal()" (change)="setFilter($event.value)">
          <mat-chip-option value="All" selected>All</mat-chip-option>
          <mat-chip-option value="Pending" color="accent">Pending</mat-chip-option>
          <mat-chip-option value="In Progress" color="primary">In Progress</mat-chip-option>
          <mat-chip-option value="Completed" color="warn">Completed</mat-chip-option>
        </mat-chip-listbox>
      </div>

      <!-- 4. Task List -->
      <div class="task-list-container">
        @if (isLoading()) {
          <mat-progress-bar mode="indeterminate" class="rounded-loader"></mat-progress-bar>
        }

        @if (filteredTasks().length === 0 && !isLoading()) {
          <div class="empty-state">
            <mat-icon class="empty-icon">assignment_turned_in</mat-icon>
            <h3>No tasks found</h3>
            <p>You're all caught up! Add a new task above.</p>
          </div>
        }

        <div class="task-grid">
          @for (task of filteredTasks(); track task.id) {
            <mat-card class="task-item" [class.completed]="task.status === 'Completed'">
              <div class="task-content">
                <div class="status-strip" [ngClass]="getStatusColor(task.status)"></div>
                <div class="task-details">
                  <div class="task-header">
                    <h3 class="task-title">{{ task.title }}</h3>
                    <span class="status-badge" [ngClass]="getStatusColor(task.status)">
                      {{ task.status }}
                    </span>
                  </div>
                  <p class="task-desc">{{ task.description || 'No description provided' }}</p>
                  <div class="task-meta" *ngIf="task.due_date">
                    <mat-icon class="text-xs">calendar_today</mat-icon>
                    <span>Due: {{ task.due_date | date:'mediumDate' }}</span>
                  </div>
                </div>
      <div class="task-actions">
                  <mat-form-field appearance="outline" class="assign-select">
                    <mat-label>Assign</mat-label>
                    <mat-select (selectionChange)="assignTo(task, $event.value)" [value]="task.assigned_to">
                      <mat-option [value]="null">Unassigned</mat-option>
                      <mat-option *ngFor="let u of users$ | async" [value]="u.id">{{ u.email }}</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <button *ngIf="task.status !== 'Completed'" mat-icon-button color="primary" (click)="setStatus(task, 'Completed')" 
                          matTooltip="Mark Complete">
                    <mat-icon>check_circle_outline</mat-icon>
                  </button>
                  <button mat-icon-button (click)="edit(task)" matTooltip="Edit Task"><mat-icon>edit</mat-icon></button>
                  <button mat-icon-button color="warn" (click)="remove(task)" matTooltip="Delete"><mat-icon>delete_outline</mat-icon></button>
                </div>
              </div>
            </mat-card>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Layout */
    .dashboard-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 0 16px 40px 16px;
      font-family: 'Roboto', sans-serif;
    }

    /* Top Nav */
    .top-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 0;
      margin-bottom: 16px;
    }

    .nav-left { display: flex; gap: 12px; align-items: center; }
    .logo-mark { 
      background: #4F46E5; color: white; width: 40px; height: 40px; 
      border-radius: 10px; display: flex; align-items: center; justify-content: center; 
    }
    .nav-left h1 { margin: 0; font-size: 20px; font-weight: 700; color: #1e293b; line-height: 1.2; }
    .subtitle { margin: 0; color: #64748b; font-size: 13px; }

    .nav-right { display: flex; gap: 8px; align-items: center; }

    /* Avatar */
    .avatar-btn {
      background: none; border: none; cursor: pointer; padding: 4px; border-radius: 50%;
      margin-left: 8px; transition: opacity 0.2s;
    }
    .avatar-btn:hover { opacity: 0.8; }
    .avatar-circle {
      width: 36px; height: 36px; background: #e0e7ff; color: #4338ca;
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-weight: 600; font-size: 14px; border: 2px solid #fff;
      box-shadow: 0 0 0 2px #e0e7ff;
    }

    /* Menu Styling */
    .menu-header { padding: 12px 16px; display: flex; flex-direction: column; outline: none; }
    .text-red-600 { color: #dc2626; }

    /* Common Animations */
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    /* Create Card */
    .create-card { border-radius: 16px; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .create-form { display: flex; flex-direction: column; padding-top: 8px; }
    .form-row { display: flex; gap: 16px; flex-wrap: wrap; }
    .flex-grow { flex: 1; min-width: 200px; }
    .status-select { width: 140px; }
    .date-select { width: 160px; }
    .add-btn { height: 56px; margin-bottom: 22px; padding: 0 24px; border-radius: 8px; }

    /* Filter Bar */
    .filter-bar { margin-bottom: 16px; }

    /* Task List */
    .task-list-container { min-height: 200px; }
    .rounded-loader { border-radius: 4px; margin-bottom: 16px; }
    .task-grid { display: flex; flex-direction: column; gap: 12px; }

    .task-item {
      padding: 0; border-radius: 12px; transition: transform 0.2s;
    }
    .task-item:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); }
    .task-item.completed { opacity: 0.65; background-color: #f8fafc; }

    .task-content { display: flex; min-height: 72px; }
    .status-strip { width: 6px; }
    .status-strip.pending { background: #94a3b8; }
    .status-strip.inprogress { background: #3b82f6; }
    .status-strip.completed { background: #22c55e; }

    .task-details { flex: 1; padding: 14px 16px; display: flex; flex-direction: column; gap: 2px; }
    .task-header { display: flex; align-items: center; gap: 10px; margin-bottom: 2px; }
    .task-title { margin: 0; font-size: 15px; font-weight: 600; color: #334155; }
    
    .status-badge { font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 600; text-transform: uppercase; }
    .status-badge.pending { background: #f1f5f9; color: #64748b; }
    .status-badge.inprogress { background: #eff6ff; color: #2563eb; }
    .status-badge.completed { background: #f0fdf4; color: #166534; }

    .task-desc { margin: 0; color: #64748b; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90%; }
    .task-meta { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #94a3b8; margin-top: 6px; }

    .task-actions { display: flex; align-items: center; padding: 0 8px; border-left: 1px solid #f1f5f9; }

    .empty-state { text-align: center; padding: 40px; color: #94a3b8; background: #f8fafc; border-radius: 12px; border: 2px dashed #e2e8f0; }
    .empty-icon { font-size: 40px; height: 40px; width: 40px; opacity: 0.5; margin-bottom: 8px; }

    @media (max-width: 600px) {
      .form-row { flex-direction: column; gap: 12px; }
      .status-select, .date-select, .add-btn { width: 100%; }
      .task-content { flex-direction: column; }
      .status-strip { height: 4px; width: 100%; }
      .task-actions { border-left: none; border-top: 1px solid #f1f5f9; padding: 4px; justify-content: flex-end; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(TaskService);
  private userService = inject(UserService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private socketService = inject(SocketService);
  private router = inject(Router);

  // Component state
  tasks = signal<Task[]>([]);
  isLoading = signal<boolean>(false);
  filterSignal = signal<string>('All');
  // Start with zero notifications by default
  notificationCount = signal<number>(0);
  notifications: any[] = [];
  // Use an observable and the async pipe to avoid ExpressionChangedAfterItHasBeenCheckedError
  users$ = this.userService.list();

  // Parse token to find current user id (if logged in) and expose a currentUser$ observable
  tokenId: number | null = null;
  currentUser$: Observable<{ id: number; email: string; displayName: string; initials: string } | null> = (() => {
    let id: number | null = null;
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      try {
        const payload = token.split('.')[1];
        const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        const obj = JSON.parse(json);
        id = obj?.id ?? null;
      } catch (e) {
        id = null;
      }
    }
    this.tokenId = id;
    return this.users$.pipe(
      map((list: any[]) => {
        if (!list || id == null) return null;
        const u = list.find((it: any) => it.id === id) || null;
        if (!u) return null;
        const displayName = (u.name && u.name.trim().length) ? u.name : (u.email || '').split('@')[0];
        const initials = (displayName || '')
          .split(/[^A-Za-z0-9]+/)
          .map((p: string) => (p ? p.charAt(0).toUpperCase() : ''))
          .filter(Boolean)
          .slice(0, 2)
          .join('') || (u.email ? u.email.charAt(0).toUpperCase() : 'U');
        return { id: u.id, email: u.email, displayName, initials };
      })
    );
  })();

  filteredTasks = computed(() => {
    const filter = this.filterSignal();
    const all = this.tasks();
    return filter === 'All' ? all : all.filter(t => t.status === filter);
  });

  pendingCount = computed(() => this.tasks().filter(t => t.status !== 'Completed').length);

  taskForm = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    status: ['Pending'],
    due_date: [null as Date | null]
  });

  ngOnInit() {
    this.load();
    // users$ is an observable consumed by the template via the async pipe
    // initialize socket connection for notifications
    try {
      this.socketService.connect();
      this.socketService.notifications$.subscribe((payload: any) => {
        // Only respond to explicit task assignment events
        if (!payload || payload.type !== 'task:assigned' || !payload.task) return;

        const task = payload.task;
        const message = payload.message || `You were assigned: ${task.title}`;

        // store a compact notification object
        const note = {
          id: `${task.id}-${Date.now()}`,
          title: task.title,
          message,
          task,
          assigned_by: payload.assigned_by ?? null,
          assigned_by_name: payload.assigned_by_name ?? payload.assigned_by_email ?? null,
          created_at: new Date().toISOString()
        };

        this.notifications.unshift(note);
        this.notificationCount.update(c => c + 1);
        this.showNotification(message);
        // reload tasks so the assigned_to shows up correctly
        this.load();
      });
    } catch (e) {
      console.warn('Socket init failed', e);
    }
  }

  clearNotifications() {
    this.notifications = [];
    this.notificationCount.set(0);
  }

  load() {
    this.isLoading.set(true);
    this.service.getTasks(true).subscribe({
      next: (data) => this.tasks.set(data),
      error: () => this.showNotification('Failed to load tasks', 'error'),
      complete: () => this.isLoading.set(false)
    });
  }

  create() {
    if (this.taskForm.invalid) return;
    this.isLoading.set(true);
    const rawVal = this.taskForm.value;
    const newTask: any = {
      title: rawVal.title,
      description: rawVal.description,
      status: rawVal.status,
      due_date: this.formatDate(rawVal.due_date)
    };

    this.service.createTask(newTask).subscribe({
      next: () => {
        this.taskForm.reset({ status: 'Pending', title: '', description: '', due_date: null });
        this.showNotification('Task added');
        this.load();
      },
      error: () => { this.isLoading.set(false); this.showNotification('Error creating task', 'error'); }
    });
  }

  // Assign task via dropdown in UI
  assignTo(task: Task, userId: number) {
    if (!task.id) return;
    this.service.assignTask(task.id, userId).subscribe(() => {
      this.showNotification('Task assigned');
      this.load();
    });
  }

  // ... (edit, setStatus, remove methods same as before)
  setStatus(task: Task, status: string) {
    if (!task.id) return;
    this.service.updateTask(task.id, { status }).subscribe(() => {
      this.load();
      this.showNotification(`Marked as ${status}`);
    });
  }

  remove(task: Task) {
    if (!task.id || !confirm('Delete this task?')) return;
    this.service.deleteTask(task.id).subscribe(() => {
      this.tasks.update(c => c.filter(t => t.id !== task.id));
      this.showNotification('Task deleted');
    });
  }

  edit(task: Task) {
    const ref = this.dialog.open(TaskEditDialogComponent, { 
      width: '500px', data: { ...task }, disableClose: true
    });
    ref.afterClosed().subscribe((res) => {
      if (!res) return;
      const payload: any = { ...res };
      if (payload.due_date instanceof Date) payload.due_date = this.formatDate(payload.due_date);
      this.service.updateTask(task.id!, payload).subscribe(() => {
        this.load();
        this.showNotification('Task updated');
      });
    });
  }

  // --- New Feature: Logout ---
  logout() {
    localStorage.removeItem('token'); // Clear auth token
    // clean up socket connection and notifications on logout
    try { this.socketService.disconnect(); } catch (e) { /* ignore */ }
    this.clearNotifications();
    this.showNotification('Logged out successfully');
    this.router.navigate(['/login']); // Navigate to login
  }

  setFilter(value: any) { if(value) this.filterSignal.set(value); }

  getStatusColor(status: string = ''): string {
    switch (status.toLowerCase()) {
      case 'completed': return 'completed';
      case 'in progress': return 'inprogress';
      default: return 'pending';
    }
  }

  private formatDate(date: Date | null | undefined): string | null {
    if (!date) return null;
    const d = new Date(date);
    const offset = d.getTimezoneOffset();
    const adjustedDate = new Date(d.getTime() - (offset * 60 * 1000));
    return adjustedDate.toISOString().split('T')[0];
  }

  private showNotification(message: string, type: 'success' | 'error' = 'success') {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: type === 'error' ? ['bg-red-500', 'text-white'] : undefined,
      horizontalPosition: 'end', verticalPosition: 'bottom'
    });
  }
}
