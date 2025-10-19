# Socket.io Chat - Frontend Integration Guide

## Quick Start

### 1. Install socket.io-client in your frontend
```bash
npm install socket.io-client
```

### 2. Initialize Socket
```javascript
import io from 'socket.io-client';

const token = localStorage.getItem('token'); // Your JWT token

const socket = io('https://app.otthonfix.com', {
  auth: {
    token: token
  }
});

socket.on('connect', () => {
  console.log('✅ Connected:', socket.id);
});
```

### 3. Join Order Chat
```javascript
socket.emit('join_order_chat', 'ORD-1234567890');

socket.on('chat_history', (messages) => {
  console.log('Chat history:', messages);
});
```

### 4. Send Message
```javascript
socket.emit('send_message', {
  orderId: 'ORD-1234567890',
  message: 'Hello from frontend!'
});
```

### 5. Listen for New Messages
```javascript
socket.on('new_message', (message) => {
  console.log('New message:', message);
  // Add to your chat UI
});
```

### 6. Typing Indicator
```javascript
// When user types
socket.emit('typing', { orderId: 'ORD-1234567890' });

// When user stops typing (after 1 second)
socket.emit('stop_typing', { orderId: 'ORD-1234567890' });

// Listen for others typing
socket.on('user_typing', ({ userName }) => {
  console.log(`${userName} is typing...`);
});
```

## API Endpoints

### GET /api/messages/:orderId
Get all messages for an order (requires JWT token)

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "orderId": "ORD-123",
  "messages": [...]
}
```

### GET /api/messages/unread/count
Get unread message count

### PUT /api/messages/:messageId/read
Mark specific message as read

### PUT /api/messages/:orderId/read-all
Mark all messages in order as read

## Socket Events

### Client → Server
- `join_order_chat` - Join a chat room
- `send_message` - Send a message
- `typing` - User is typing
- `stop_typing` - User stopped typing
- `leave_order_chat` - Leave chat room

### Server → Client
- `chat_history` - Chat history after joining
- `new_message` - New message received
- `user_typing` - Someone is typing
- `user_stop_typing` - Someone stopped typing
- `error` - Error occurred

## Security

✅ JWT authentication required
✅ Access control (only order participants can access)
✅ Message validation
✅ Automatic reconnection

## Complete React Example

See full React component example in the artifacts above.
