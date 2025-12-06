import { Server } from '@hocuspocus/server';

const server = new Server({
  port: 1234,

  async onConnect({ documentName }) {
    console.log(`Client connected to document: ${documentName}`);
  },

  async onDisconnect({ documentName }) {
    console.log(`Client disconnected from document: ${documentName}`);
  },

  async onStoreDocument({ documentName }) {
    console.log(`Document stored: ${documentName}`);
  },
});

server.listen();
console.log('Hocuspocus server is running on port 1234');
