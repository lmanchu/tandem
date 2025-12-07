#!/usr/bin/env node
/**
 * Tandem MCP Server
 *
 * Provides tools for Claude Code to interact with Tandem documents:
 * - tandem_list: List all documents
 * - tandem_read: Read document content (as Markdown)
 * - tandem_write: Write/update document content
 * - tandem_create: Create a new document
 * - tandem_delete: Delete a document
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Configuration
const TANDEM_API_URL = process.env.TANDEM_API_URL || 'https://tandem.irisgo.xyz';
const TANDEM_PASSWORD = process.env.TANDEM_PASSWORD || '';

// Generate auth token (same logic as server)
function getAuthToken(): string {
  if (!TANDEM_PASSWORD) return '';
  return Buffer.from(TANDEM_PASSWORD).toString('base64');
}

function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Create MCP server
const server = new Server(
  {
    name: 'tandem-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'tandem_list',
        description: 'List all Tandem documents. Returns document IDs, titles, and metadata.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'tandem_read',
        description: 'Read the content of a Tandem document. Returns the document content as Markdown/HTML.',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: {
              type: 'string',
              description: 'The ID of the document to read',
            },
          },
          required: ['documentId'],
        },
      },
      {
        name: 'tandem_write',
        description: 'Write or update the content of a Tandem document. Accepts Markdown or HTML content.',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: {
              type: 'string',
              description: 'The ID of the document to write to',
            },
            content: {
              type: 'string',
              description: 'The content to write (Markdown or HTML)',
            },
          },
          required: ['documentId', 'content'],
        },
      },
      {
        name: 'tandem_create',
        description: 'Create a new Tandem document with optional initial content.',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Title of the new document (will be used as document ID)',
            },
            content: {
              type: 'string',
              description: 'Optional initial content (Markdown or HTML)',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'tandem_delete',
        description: 'Delete a Tandem document.',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: {
              type: 'string',
              description: 'The ID of the document to delete',
            },
          },
          required: ['documentId'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'tandem_list': {
        const response = await fetch(`${TANDEM_API_URL}/api/documents`, {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error(`Failed to list documents: ${response.status}`);
        }

        const documents = await response.json();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(documents, null, 2),
            },
          ],
        };
      }

      case 'tandem_read': {
        const { documentId } = args as { documentId: string };

        // Get document content
        const response = await fetch(`${TANDEM_API_URL}/api/documents/${documentId}/content`, {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Document not found: ${documentId}`);
          }
          throw new Error(`Failed to read document: ${response.status}`);
        }

        const data = await response.json();
        return {
          content: [
            {
              type: 'text',
              text: data.content || '',
            },
          ],
        };
      }

      case 'tandem_write': {
        const { documentId, content } = args as { documentId: string; content: string };

        const response = await fetch(`${TANDEM_API_URL}/api/documents/${documentId}/content`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ content }),
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Document not found: ${documentId}`);
          }
          throw new Error(`Failed to write document: ${response.status}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: `Successfully updated document: ${documentId}`,
            },
          ],
        };
      }

      case 'tandem_create': {
        const { title, content } = args as { title: string; content?: string };

        // Create document
        const createResponse = await fetch(`${TANDEM_API_URL}/api/documents`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ title }),
        });

        if (!createResponse.ok) {
          if (createResponse.status === 409) {
            throw new Error(`Document already exists: ${title}`);
          }
          throw new Error(`Failed to create document: ${createResponse.status}`);
        }

        const doc = await createResponse.json();

        // If content provided, write it
        if (content) {
          const writeResponse = await fetch(`${TANDEM_API_URL}/api/documents/${doc.id}/content`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({ content }),
          });

          if (!writeResponse.ok) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Document created (${doc.id}) but failed to write initial content: ${writeResponse.status}`,
                },
              ],
            };
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: `Created document: ${doc.id}${content ? ' (with initial content)' : ''}`,
            },
          ],
        };
      }

      case 'tandem_delete': {
        const { documentId } = args as { documentId: string };

        const response = await fetch(`${TANDEM_API_URL}/api/documents/${documentId}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Document not found: ${documentId}`);
          }
          throw new Error(`Failed to delete document: ${response.status}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: `Deleted document: ${documentId}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Tandem MCP Server started');
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
