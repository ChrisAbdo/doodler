import { v4 as uuidv4 } from "uuid";

const clients = new Map();
let firstClientId = null; // ID of the first client who can draw

const server = Bun.serve({
  fetch(req, server) {
    const success = server.upgrade(req);
    if (success) {
      return undefined;
    }
    return new Response("Not a WebSocket request");
  },
  websocket: {
    open(ws) {
      const id = uuidv4();
      clients.set(id, ws);
      if (!firstClientId) {
        firstClientId = id; // Set the first client
        ws.send(JSON.stringify({ type: "drawer", id: id })); // Notify the first client they can draw
      } else {
        ws.send(JSON.stringify({ type: "viewer", id: id })); // Notify other clients they are viewers
      }
      console.log(`Client connected: ${id}`);
      broadcast(`Active connections: ${clients.size}`);
      broadcast(JSON.stringify({ activeConnections: clients.size })); // Send active connections count to all clients
    },
    message(ws, message) {
      const id = [...clients.entries()].find(([key, val]) => val === ws)[0];
      if (id === firstClientId) {
        // Broadcast drawing data to all clients except the sender
        clients.forEach((client, clientId) => {
          if (clientId !== id) {
            client.send(message); // Ensure the message (which includes color) is forwarded as received
          }
        });
      }
    },
    close(ws, code, reason) {
      const id = [...clients.entries()].find(([key, val]) => val === ws)[0];
      clients.delete(id);
      if (id === firstClientId) {
        firstClientId = null; // Reset the first client if they disconnect
        // Optionally, assign a new drawer
      }
      console.log(`Client disconnected: ${id} - ${code} ${reason}`);
      broadcast(`Active connections: ${clients.size}`);
      broadcast(JSON.stringify({ activeConnections: clients.size })); // Update active connections count to all clients
    },
  },
  port: 8080,
});

function broadcast(message) {
  clients.forEach((client) => {
    client.send(message);
  });
}

console.log(`WebSocket server running on ws://localhost:${server.port}`);
