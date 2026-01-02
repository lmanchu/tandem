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
import { readFileSync } from 'fs';

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
    version: '1.10.0',
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
            format: {
              type: 'string',
              enum: ['markdown', 'html', 'auto'],
              description: 'Content format: "markdown", "html", or "auto" (default: auto-detect)',
            },
            mode: {
              type: 'string',
              enum: ['replace', 'append'],
              description: 'Write mode: "replace" overwrites content, "append" adds to end (default: replace)',
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
      {
        name: 'tandem_sync_project',
        description: 'Sync a local folder of markdown files to Tandem as a project. Documents will be named as "ProjectName/filename". Creates new documents or updates existing ones.',
        inputSchema: {
          type: 'object',
          properties: {
            projectName: {
              type: 'string',
              description: 'Name of the project (will be used as folder prefix)',
            },
            files: {
              type: 'array',
              description: 'Array of files to sync',
              items: {
                type: 'object',
                properties: {
                  filename: {
                    type: 'string',
                    description: 'Filename without extension (e.g., "Product-Brief")',
                  },
                  content: {
                    type: 'string',
                    description: 'Markdown content of the file',
                  },
                },
                required: ['filename', 'content'],
              },
            },
          },
          required: ['projectName', 'files'],
        },
      },
      {
        name: 'tandem_list_project',
        description: 'List all documents in a specific project (documents with "ProjectName/" prefix).',
        inputSchema: {
          type: 'object',
          properties: {
            projectName: {
              type: 'string',
              description: 'Name of the project to list documents for',
            },
          },
          required: ['projectName'],
        },
      },
      {
        name: 'tandem_suggest_changes',
        description: 'Submit local changes as Track Changes suggestions. Instead of overwriting the document, changes will appear as suggestions that users can accept or reject in Tandem. Perfect for bidirectional sync where conflicts need human review.',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: {
              type: 'string',
              description: 'The ID of the document to suggest changes to',
            },
            content: {
              type: 'string',
              description: 'The new content (Markdown). Differences from current content will become Track Changes suggestions.',
            },
            source: {
              type: 'string',
              description: 'Source identifier (e.g., "Obsidian PKM", "Local Editor"). Defaults to "Obsidian Sync".',
            },
          },
          required: ['documentId', 'content'],
        },
      },
      {
        name: 'tandem_get_track_changes',
        description: 'Get all pending Track Changes for a document. Shows suggested insertions and deletions awaiting review.',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: {
              type: 'string',
              description: 'The ID of the document to get track changes for',
            },
          },
          required: ['documentId'],
        },
      },
      {
        name: 'tandem_write_from_file',
        description: 'Write a large local file to a Tandem document. Reads content directly from local filesystem, bypassing message size limits. Perfect for syncing large markdown files.',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: {
              type: 'string',
              description: 'The ID of the document to write to',
            },
            filePath: {
              type: 'string',
              description: 'Absolute path to the local file to read and sync (e.g., /Users/lman/PKM-Vault/doc.md)',
            },
          },
          required: ['documentId', 'filePath'],
        },
      },
      {
        name: 'tandem_search',
        description: 'Search for text across all Tandem documents. Returns matching documents with context snippets showing where the search term appears.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (minimum 2 characters). Searches document content.',
            },
          },
          required: ['query'],
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
        const { documentId, content, format, mode } = args as {
          documentId: string;
          content: string;
          format?: 'markdown' | 'html' | 'auto';
          mode?: 'replace' | 'append';
        };

        let finalContent = content;

        // Handle append mode - read existing content first
        if (mode === 'append') {
          const readResponse = await fetch(`${TANDEM_API_URL}/api/documents/${documentId}/content`, {
            headers: getAuthHeaders(),
          });

          if (readResponse.ok) {
            const data = await readResponse.json();
            const existingContent = data.content || '';
            // Append with newline separator
            finalContent = existingContent + '\n\n' + content;
          }
          // If document doesn't exist, just use the new content
        }

        const response = await fetch(`${TANDEM_API_URL}/api/documents/${documentId}/content`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            content: finalContent,
            format: format || 'auto',
          }),
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Document not found: ${documentId}`);
          }
          throw new Error(`Failed to write document: ${response.status}`);
        }

        const modeText = mode === 'append' ? 'appended to' : 'updated';
        return {
          content: [
            {
              type: 'text',
              text: `Successfully ${modeText} document: ${documentId}`,
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

      case 'tandem_sync_project': {
        const { projectName, files } = args as {
          projectName: string;
          files: Array<{ filename: string; content: string }>;
        };

        const results: string[] = [];
        let created = 0;
        let updated = 0;
        let failed = 0;

        for (const file of files) {
          const docId = `${projectName}/${file.filename}`;

          try {
            // Check if document exists
            const checkResponse = await fetch(`${TANDEM_API_URL}/api/documents/${encodeURIComponent(docId)}`, {
              headers: getAuthHeaders(),
            });

            if (checkResponse.ok) {
              // Update existing document
              const writeResponse = await fetch(`${TANDEM_API_URL}/api/documents/${encodeURIComponent(docId)}/content`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  ...getAuthHeaders(),
                },
                body: JSON.stringify({ content: file.content }),
              });

              if (writeResponse.ok) {
                updated++;
                results.push(`✓ Updated: ${docId}`);
              } else {
                failed++;
                results.push(`✗ Failed to update: ${docId}`);
              }
            } else {
              // Create new document
              const createResponse = await fetch(`${TANDEM_API_URL}/api/documents`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...getAuthHeaders(),
                },
                body: JSON.stringify({ title: docId }),
              });

              if (createResponse.ok) {
                // Write content
                const writeResponse = await fetch(`${TANDEM_API_URL}/api/documents/${encodeURIComponent(docId)}/content`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders(),
                  },
                  body: JSON.stringify({ content: file.content }),
                });

                if (writeResponse.ok) {
                  created++;
                  results.push(`✓ Created: ${docId}`);
                } else {
                  failed++;
                  results.push(`✗ Created but failed to write content: ${docId}`);
                }
              } else {
                failed++;
                results.push(`✗ Failed to create: ${docId}`);
              }
            }
          } catch (err) {
            failed++;
            results.push(`✗ Error: ${docId} - ${err}`);
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: `Project sync complete: ${projectName}\n\nCreated: ${created}, Updated: ${updated}, Failed: ${failed}\n\n${results.join('\n')}`,
            },
          ],
        };
      }

      case 'tandem_list_project': {
        const { projectName } = args as { projectName: string };

        const response = await fetch(`${TANDEM_API_URL}/api/documents`, {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error(`Failed to list documents: ${response.status}`);
        }

        const allDocuments = await response.json();
        const projectDocs = allDocuments.filter((doc: { id: string; title: string }) =>
          doc.id.startsWith(`${projectName}/`) || doc.title.startsWith(`${projectName}/`)
        );

        return {
          content: [
            {
              type: 'text',
              text: `Project: ${projectName}\nDocuments: ${projectDocs.length}\n\n${JSON.stringify(projectDocs, null, 2)}`,
            },
          ],
        };
      }

      case 'tandem_suggest_changes': {
        const { documentId, content, source } = args as {
          documentId: string;
          content: string;
          source?: string;
        };

        const response = await fetch(
          `${TANDEM_API_URL}/api/documents/${encodeURIComponent(documentId)}/suggest-changes`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({ content, source: source || 'Obsidian Sync' }),
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Document not found: ${documentId}`);
          }
          throw new Error(`Failed to suggest changes: ${response.status}`);
        }

        const result = await response.json();

        if (result.changesCount === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No changes detected for document: ${documentId}`,
              },
            ],
          };
        }

        // Format the changes summary
        const changesSummary = result.changes
          .map((c: { type: string; preview: string }) => `  - ${c.type}: "${c.preview}..."`)
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `Suggested ${result.changesCount} changes to document: ${documentId}\n\nChanges:\n${changesSummary}\n\nOpen Tandem to review and accept/reject these suggestions.`,
            },
          ],
        };
      }

      case 'tandem_get_track_changes': {
        const { documentId } = args as { documentId: string };

        const response = await fetch(
          `${TANDEM_API_URL}/api/documents/${encodeURIComponent(documentId)}/track-changes`,
          {
            headers: getAuthHeaders(),
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Document not found: ${documentId}`);
          }
          throw new Error(`Failed to get track changes: ${response.status}`);
        }

        const result = await response.json();

        if (result.changesCount === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No pending track changes for document: ${documentId}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Track Changes for ${documentId}:\nTotal: ${result.changesCount} pending changes\n\n${JSON.stringify(result.changes, null, 2)}`,
            },
          ],
        };
      }

      case 'tandem_write_from_file': {
        const { documentId, filePath } = args as { documentId: string; filePath: string };

        // Read content from local file
        let content: string;
        try {
          content = readFileSync(filePath, 'utf-8');
        } catch (err) {
          throw new Error(`Failed to read file: ${filePath} - ${err}`);
        }

        const fileSize = Buffer.byteLength(content, 'utf-8');
        const fileSizeKB = (fileSize / 1024).toFixed(1);

        // Write to Tandem
        const response = await fetch(`${TANDEM_API_URL}/api/documents/${encodeURIComponent(documentId)}/content`, {
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
              text: `Successfully synced file to Tandem:\n- Document: ${documentId}\n- Source: ${filePath}\n- Size: ${fileSizeKB} KB`,
            },
          ],
        };
      }

      case 'tandem_search': {
        const { query } = args as { query: string };

        if (!query || query.trim().length < 2) {
          return {
            content: [
              {
                type: 'text',
                text: 'Search query must be at least 2 characters',
              },
            ],
            isError: true,
          };
        }

        const response = await fetch(
          `${TANDEM_API_URL}/api/search?q=${encodeURIComponent(query.trim())}`,
          {
            headers: getAuthHeaders(),
          }
        );

        if (!response.ok) {
          throw new Error(`Search failed: ${response.status}`);
        }

        const data = await response.json();
        const results = data.results as Array<{
          documentId: string;
          documentTitle: string;
          matches: Array<{
            text: string;
            context: string;
            position: number;
          }>;
        }>;

        if (results.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No results found for: "${query}"`,
              },
            ],
          };
        }

        // Format results for readability
        const formattedResults = results.map((doc) => {
          const matchList = doc.matches
            .map((m) => `    • ${m.context}`)
            .join('\n');
          return `📄 ${doc.documentTitle} (${doc.matches.length} match${doc.matches.length > 1 ? 'es' : ''})\n${matchList}`;
        }).join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `Found ${results.length} document${results.length > 1 ? 's' : ''} matching "${query}":\n\n${formattedResults}`,
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
