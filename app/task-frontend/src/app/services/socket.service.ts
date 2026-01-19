import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;
  private notificationSubject = new Subject<any>();
  notifications$ = this.notificationSubject.asObservable();

  connect() {
    if (this.socket) return;
    const token = localStorage.getItem('token');

    // Connect to backend (adjust URL if needed for deployments)
    this.socket = io('http://localhost:3000', {
      autoConnect: true,
      transports: ['websocket']
    });

    this.socket.on('connect', () => {
      // send authentication event expected by the server
      if (token) {
        this.socket?.emit('authenticate', token);
      }
    });

    this.socket.on('notification', (payload: any) => {
      this.notificationSubject.next(payload);
    });

    this.socket.on('disconnect', () => {
      // no-op for now; consumer can react via notifications stream
      console.debug('Socket disconnected');
    });

    this.socket.on('connect_error', (err: any) => {
      console.error('Socket connect error', err);
    });
  }

  disconnect() {
    if (!this.socket) return;
    this.socket.disconnect();
    this.socket = null;
  }

  emit(event: string, data?: any) {
    this.socket?.emit(event, data);
  }
}

