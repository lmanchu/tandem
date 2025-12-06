# Tandem API Documentation

Backend API for Tandem - AI-native collaboration platform

**Base URL:** `http://localhost:3000`

## Overview

Tandem provides a Git-backed file storage system with AI/human attribution. Every file operation creates a Git commit with metadata indicating whether the change was made by a human or AI.

## Core Concepts

- **Author Type**: Either `ai` or `human`
- **Author Name**: Display name for the author (e.g., "AI Assistant", "Lman")
- **Commit Metadata**: Each commit includes emoji indicators (🤖 for AI, 👤 for human) and structured metadata

## API Endpoints

### Health Check

**GET /**

Returns API status information.

**Response:**
```json
{
  "name": "Tandem API",
  "version": "0.1.0",
  "status": "running"
}
```

---

### Initialize Repository

**POST /api/init**

Initializes the Git repository. This is typically called once during setup.

**Response:**
```json
{
  "success": true,
  "message": "Repository initialized"
}
```

---

## Files API

### List All Files

**GET /api/files**

Returns a list of all files in the workspace.

**Response:**
```json
{
  "files": [
    {
      "path": "docs/readme.md",
      "name": "readme.md",
      "type": "file",
      "size": 1234,
      "modified": "2025-12-05T14:24:58.000Z"
    }
  ]
}
```

---

### Get File Content

**GET /api/files/{filePath}**

Retrieves file content and metadata.

**Parameters:**
- `filePath`: Path to the file (e.g., `docs/readme.md`)

**Response:**
```json
{
  "path": "docs/readme.md",
  "content": "File content here...",
  "metadata": {
    "size": 1234,
    "modified": "2025-12-05T14:24:58.000Z",
    "commit": "abc1234",
    "author": "ai"
  }
}
```

**Error (404):**
```json
{
  "error": "File not found"
}
```

---

### Create or Update File

**POST /api/files/{filePath}**

Creates a new file or updates an existing one. Automatically creates a Git commit.

**Parameters:**
- `filePath`: Path to the file (e.g., `docs/readme.md`)

**Request Body:**
```json
{
  "content": "File content here...",
  "author": "human",
  "authorName": "Lman",
  "message": "Optional custom commit message"
}
```

**Fields:**
- `content` (required): File content as a string
- `author` (optional): Either `"ai"` or `"human"` (default: `"human"`)
- `authorName` (optional): Display name for the author (default: `"User"`)
- `message` (optional): Custom commit message. If not provided, auto-generates "Created {file}" or "Updated {file}"

**Response:**
```json
{
  "success": true,
  "commit": "abc1234567890",
  "message": "Created docs/readme.md"
}
```

**Error (400):**
```json
{
  "error": "Content is required"
}
```

---

### Delete File

**DELETE /api/files/{filePath}**

Deletes a file and creates a Git commit for the deletion.

**Parameters:**
- `filePath`: Path to the file (e.g., `docs/readme.md`)

**Request Body:**
```json
{
  "author": "human",
  "authorName": "Lman"
}
```

**Fields:**
- `author` (optional): Either `"ai"` or `"human"` (default: `"human"`)
- `authorName` (optional): Display name for the author (default: `"User"`)

**Response:**
```json
{
  "success": true,
  "commit": "abc1234567890"
}
```

---

## Commits API

### Get Commit History

**GET /api/commits**

Returns commit history with optional filtering.

**Query Parameters:**
- `file` (optional): Filter commits by file path
- `limit` (optional): Maximum number of commits to return (default: 50)

**Example:**
- `/api/commits` - Get all commits (up to 50)
- `/api/commits?file=docs/readme.md` - Get commits for a specific file
- `/api/commits?limit=10` - Get last 10 commits

**Response:**
```json
{
  "commits": [
    {
      "sha": "abc1234567890",
      "message": "Updated docs/readme.md",
      "author": "ai",
      "authorName": "AI Assistant",
      "timestamp": "2025-12-05T14:24:58.000Z",
      "filesChanged": ["docs/readme.md"]
    }
  ]
}
```

---

### Get Commit Details with Diff

**GET /api/commits/{sha}**

Returns detailed information about a specific commit, including the diff.

**Parameters:**
- `sha`: Commit hash

**Response:**
```json
{
  "commit": {
    "sha": "abc1234567890",
    "message": "Updated docs/readme.md",
    "author": "ai",
    "authorName": "AI Assistant",
    "timestamp": "2025-12-05T14:24:58.000Z"
  },
  "diff": "diff --git a/docs/readme.md b/docs/readme.md\n..."
}
```

---

### Revert to Commit

**POST /api/commits/{sha}/revert**

Creates a revert commit that undoes the changes from the specified commit.

**Parameters:**
- `sha`: Commit hash to revert

**Response:**
```json
{
  "success": true,
  "newCommit": "def9876543210"
}
```

---

## Sync API

### Get Sync Status

**GET /api/sync/status**

Returns the current Git sync status with the remote repository.

**Response:**
```json
{
  "branch": "master",
  "tracking": "origin/master",
  "ahead": 3,
  "behind": 0,
  "isSynced": false,
  "hasRemote": true
}
```

**Fields:**
- `branch`: Current branch name
- `tracking`: Remote tracking branch
- `ahead`: Number of commits ahead of remote
- `behind`: Number of commits behind remote
- `isSynced`: Whether local and remote are in sync
- `hasRemote`: Whether a remote repository is configured

---

### Push to Remote

**POST /api/sync/push**

Pushes local commits to the remote repository (GitHub).

**Response (Success):**
```json
{
  "success": true,
  "branch": "master",
  "message": "Pushed to origin/master"
}
```

**Response (Failure):**
```json
{
  "success": false,
  "error": "No remote repository configured"
}
```

---

### Pull from Remote

**POST /api/sync/pull**

Pulls updates from the remote repository.

**Response (Success):**
```json
{
  "success": true,
  "branch": "master",
  "filesChanged": ["docs/readme.md"],
  "insertions": 10,
  "deletions": 5,
  "message": "Pulled from origin/master"
}
```

**Response (Failure):**
```json
{
  "success": false,
  "error": "Merge conflict detected"
}
```

---

### Set Remote Repository

**POST /api/sync/remote**

Configures the remote repository URL.

**Request Body:**
```json
{
  "url": "https://github.com/user/repo.git"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Remote configured successfully"
}
```

---

## Error Handling

All errors return appropriate HTTP status codes with error messages:

**Format:**
```json
{
  "error": "Error message here"
}
```

**Common Status Codes:**
- `400` - Bad Request (e.g., missing required fields)
- `404` - Not Found (e.g., file doesn't exist)
- `500` - Internal Server Error

---

## Commit Message Format

All commits follow this format:

```
{emoji} {message}

Type: {author type}
Author: {author name}
File: {file path}
```

**Example:**
```
🤖 Updated docs/readme.md

Type: ai
Author: AI Assistant
File: docs/readme.md
```

**Emojis:**
- 🤖 - AI-generated changes
- 👤 - Human-generated changes

---

## Development Notes

**Running the Server:**
```bash
cd ~/Dropbox/PKM-Vault/3-Development/Projects/tandem/backend
npm run dev
```

**Workspace Location:**
- Files are stored in: `backend/workspace/`
- Git repository: `backend/workspace/.git/`

**CORS Configuration:**
- Allowed origins: `http://localhost:5173`, `http://localhost:3000`
- This allows the frontend to make API requests

---

## CLI Tool

For AI agents, there's a companion CLI tool that automatically tags operations as `ai`:

```bash
tandem init                    # Initialize workspace
tandem list                    # List files
tandem read {file}             # Read file
tandem write {file} {content}  # Create/update file
tandem delete {file}           # Delete file
tandem history [file]          # Show commit history
tandem status                  # Show workspace status
```

The CLI automatically sets `author: "ai"` for all operations.
