// WebSocket Manager
import { WebSocket, WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { parse } from 'url';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  schoolId?: string;
  role?: 'admin' | 'teacher' | 'student';
  isAlive?: boolean;
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, Set<AuthenticatedWebSocket>>;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.clients = new Map();
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: AuthenticatedWebSocket, request) => {
      console.log('New WebSocket connection');

      // Parse URL and authenticate
      const { query } = parse(request.url || '', true);
      const token = query.token as string;

      if (!token) {
        ws.close(4001, 'Authentication required');
        return;
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
          userId: string;
          role: 'admin' | 'teacher' | 'student';
          schoolId: string;
        };

        ws.userId = decoded.userId;
        ws.schoolId = decoded.schoolId;
        ws.role = decoded.role;
        ws.isAlive = true;

        // Add to school's client set
        if (!this.clients.has(decoded.schoolId)) {
          this.clients.set(decoded.schoolId, new Set());
        }
        this.clients.get(decoded.schoolId)!.add(ws);

        console.log(`User ${decoded.userId} from school ${decoded.schoolId} connected`);

        // Send welcome message
        ws.send(JSON.stringify({
          type: 'connected',
          message: 'Connected to real-time service',
          userId: decoded.userId,
          schoolId: decoded.schoolId
        }));

        // Handle messages
        ws.on('message', (message: string) => {
          try {
            const data = JSON.parse(message.toString());
            this.handleMessage(ws, data);
          } catch (error) {
            console.error('Invalid message format:', error);
          }
        });

        // Handle pong
        ws.on('pong', () => {
          ws.isAlive = true;
        });

        // Handle disconnect
        ws.on('close', () => {
          console.log(`User ${ws.userId} disconnected`);
          if (ws.schoolId && this.clients.has(ws.schoolId)) {
            this.clients.get(ws.schoolId)!.delete(ws);
          }
        });

      } catch (error) {
        console.error('Authentication failed:', error);
        ws.close(4001, 'Invalid token');
      }
    });

    // Heartbeat to detect broken connections
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws: AuthenticatedWebSocket) => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  private handleMessage(ws: AuthenticatedWebSocket, data: any) {
    console.log('Received message:', data);

    switch (data.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;

      case 'subscribe':
        // Subscribe to specific channels (classId, assignmentId, etc.)
        console.log(`User ${ws.userId} subscribed to ${data.channel}`);
        break;

      case 'unsubscribe':
        console.log(`User ${ws.userId} unsubscribed from ${data.channel}`);
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  }

  // Broadcast to all clients in a school
  public broadcastToSchool(schoolId: string, message: any) {
    const clients = this.clients.get(schoolId);
    if (!clients) return;

    const messageStr = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  // Broadcast to specific user
  public sendToUser(userId: string, schoolId: string, message: any) {
    const clients = this.clients.get(schoolId);
    if (!clients) return;

    const messageStr = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.userId === userId && client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  // Broadcast to all users with specific role in a school
  public broadcastToRole(schoolId: string, role: 'admin' | 'teacher' | 'student', message: any) {
    const clients = this.clients.get(schoolId);
    if (!clients) return;

    const messageStr = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.role === role && client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }
}
