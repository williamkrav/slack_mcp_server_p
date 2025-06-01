# API Extension Implementation Plan

## Overview
This document outlines the implementation plan for extending the Slack MCP Server with Files, Search, and Reminder APIs to enhance automation capabilities.

## 1. Files API Implementation

### 1.1 slack_files_upload
**Purpose**: Upload files to Slack workspace

**TypeScript Interface**:
```typescript
interface FilesUploadArgs {
  content?: string;           // File content (for text files)
  file?: Buffer;             // Binary file content
  filename?: string;         // Filename 
  filetype?: string;         // File type (auto-detect if not provided)
  title?: string;            // Title of the file
  initial_comment?: string;  // Message to add about the file
  channels?: string[];       // Channel IDs to share the file
  thread_ts?: string;        // Thread timestamp to upload into
}
```

**Implementation Notes**:
- Use `files.upload` API endpoint
- Handle both text content and binary uploads
- Support multipart/form-data for binary files
- Auto-detect MIME types when not provided

### 1.2 slack_files_list
**Purpose**: List files in the workspace

**TypeScript Interface**:
```typescript
interface FilesListArgs {
  channel?: string;     // Filter by channel
  user?: string;        // Filter by user who uploaded
  types?: string;       // Comma-separated file types (e.g., "images,pdfs")
  from?: number;        // Start timestamp (Unix epoch)
  to?: number;          // End timestamp (Unix epoch)
  count?: number;       // Number of items to return (default: 100)
  page?: number;        // Page number for pagination
}
```

**Implementation Notes**:
- Use `files.list` API endpoint
- Support filtering by multiple criteria
- Handle pagination for large result sets

### 1.3 slack_files_info
**Purpose**: Get detailed information about a file

**TypeScript Interface**:
```typescript
interface FilesInfoArgs {
  file: string;         // File ID
  page?: number;        // Page of comments to return
  count?: number;       // Number of comments per page
}
```

**Implementation Notes**:
- Use `files.info` API endpoint
- Include file metadata, sharing info, and comments

### 1.4 slack_files_delete
**Purpose**: Delete a file

**TypeScript Interface**:
```typescript
interface FilesDeleteArgs {
  file: string;         // File ID to delete
}
```

**Implementation Notes**:
- Use `files.delete` API endpoint
- Requires user token with files:write scope

## 2. Search API Implementation

### 2.1 slack_search_messages
**Purpose**: Search messages across the workspace

**TypeScript Interface**:
```typescript
interface SearchMessagesArgs {
  query: string;        // Search query with operators
  sort?: "score" | "timestamp";  // Sort order (default: score)
  sort_dir?: "asc" | "desc";     // Sort direction
  highlight?: boolean;            // Include highlight markers
  count?: number;                 // Results per page (default: 20)
  page?: number;                  // Page number
}
```

**Query Syntax Support**:
- `from:@username` - Messages from specific user
- `in:#channel` - Messages in specific channel
- `has:link` - Messages containing links
- `during:today` - Time-based filters
- `"exact phrase"` - Exact phrase matching

**Implementation Notes**:
- Use `search.messages` API endpoint
- Parse and validate search query syntax
- Return highlighted snippets for context

### 2.2 slack_search_files
**Purpose**: Search files in the workspace

**TypeScript Interface**:
```typescript
interface SearchFilesArgs {
  query: string;        // Search query
  sort?: "score" | "timestamp";  // Sort order
  sort_dir?: "asc" | "desc";     // Sort direction
  highlight?: boolean;            // Include highlights
  count?: number;                 // Results per page
  page?: number;                  // Page number
}
```

**Implementation Notes**:
- Use `search.files` API endpoint
- Support same query syntax as message search
- Include file preview information

## 3. Reminder API Implementation

### 3.1 slack_reminders_add
**Purpose**: Create a new reminder

**TypeScript Interface**:
```typescript
interface RemindersAddArgs {
  text: string;         // Reminder text
  time: string | number; // When to remind (timestamp or natural language)
  user?: string;        // User to remind (default: self)
  recurrence?: {        // Optional recurring reminder
    frequency: "daily" | "weekly" | "monthly" | "yearly";
    interval?: number;  // Frequency interval
    days?: string[];    // Days of week for weekly
  };
}
```

**Time Format Support**:
- Unix timestamp: `1234567890`
- Natural language: `"tomorrow at 3pm"`, `"next Monday"`, `"in 2 hours"`

**Implementation Notes**:
- Use `reminders.add` API endpoint
- Parse natural language time inputs
- Validate user permissions for reminding others

### 3.2 slack_reminders_list
**Purpose**: List active reminders

**TypeScript Interface**:
```typescript
interface RemindersListArgs {
  user?: string;        // Filter by user (default: self)
}
```

**Implementation Notes**:
- Use `reminders.list` API endpoint
- Include recurring reminder information
- Sort by time ascending

### 3.3 slack_reminders_delete
**Purpose**: Delete a reminder

**TypeScript Interface**:
```typescript
interface RemindersDeleteArgs {
  reminder: string;     // Reminder ID
}
```

**Implementation Notes**:
- Use `reminders.delete` API endpoint
- Only allow deleting own reminders

## 4. Implementation Strategy

### Phase 1: Core Implementation
1. Add TypeScript interfaces for all new tools
2. Implement SlackClient methods for each API
3. Add MCP tool definitions and handlers
4. Basic error handling and validation

### Phase 2: Testing
1. Unit tests for each SlackClient method
2. Integration tests for MCP tool handlers
3. Mock Slack API responses
4. Edge case testing (large files, complex searches)

### Phase 3: Enhancement
1. Advanced search query parsing
2. File type detection and validation
3. Natural language time parsing for reminders
4. Rate limiting and retry logic

### Phase 4: Documentation
1. Update README with new features
2. Add usage examples for each tool
3. Document search query syntax
4. Update SETUP.md if needed

## 5. Technical Considerations

### Authentication
- Files API requires `files:read` and `files:write` scopes
- Search API requires `search:read` scope
- Reminders API requires `reminders:read` and `reminders:write` scopes

### Rate Limiting
- Implement exponential backoff for rate limits
- Queue file uploads to avoid hitting limits
- Cache search results where appropriate

### Error Handling
- Graceful handling of network errors
- Clear error messages for permission issues
- Validation of file sizes and types

### Performance
- Stream large file uploads
- Implement pagination for all list operations
- Optimize search query execution

## 6. Testing Requirements

### Unit Tests
- Test each API method with various parameters
- Test error conditions and edge cases
- Test pagination logic

### Integration Tests
- End-to-end file upload and retrieval
- Search with complex queries
- Reminder creation and deletion flow

### Manual Testing
- Test with real Slack workspace
- Verify file previews and thumbnails
- Test reminder notifications