import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Task {
  id?: number;
  title: string;
  description?: string;
  assigned_to?: number | null;
  status?: string;
  // due_date can be a string (YYYY-MM-DD) or a Date while editing in the UI
  due_date?: string | Date | null;
  // optional fields returned by API
  assigned_to_email?: string | null;
  created_at?: string | Date | null;
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private base = 'http://localhost:3000/tasks';

  constructor(private http: HttpClient) {}

  private headers() {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return { headers };
  }

  private getUserIdFromToken(): number | null {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const payload = token.split('.')[1];
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      const obj = JSON.parse(decodeURIComponent(escape(json)));
      return obj?.id ?? null;
    } catch (e) {
      return null;
    }
  }

  getTasks(mine = false): Observable<Task[]> {
    const url = mine ? `${this.base}?mine=true` : this.base;
    return this.http.get<Task[]>(url, this.headers());
  }

  createTask(task: Task): Observable<Task> {
    const t = { ...task } as Task;
    if (!t.assigned_to) {
      t.assigned_to = this.getUserIdFromToken();
    }
    return this.http.post<Task>(this.base, t, this.headers());
  }

  assignTask(taskId: number, userId: number) {
    return this.http.post(`${this.base}/${taskId}/assign`, { user_id: userId }, this.headers());
  }

  updateTask(id: number, patch: Partial<Task>): Observable<Task> {
    return this.http.put<Task>(`${this.base}/${id}`, patch, this.headers());
  }

  deleteTask(id: number) {
    return this.http.delete(`${this.base}/${id}`, this.headers());
  }
}
