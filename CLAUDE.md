# CLAUDE.md

This file provides guidance to AI assistants (like Claude Code) when working with code in this repository.

## Project Overview

This is a Slack MCP (Model Context Protocol) Server that enables Claude to interact with Slack workspaces. It features dynamic channel discovery and full Canvas API support.

## Development Commands

```bash
# Build the project
npm run build

# Watch mode for development
npm run watch

# Run tests
npm test

# Run a single test file
npm test -- test/canvasFeatures.test.ts

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Architecture

The codebase follows a single-file architecture in `src/index.ts` containing:

1. **TypeScript Interfaces**: All tool arguments and Canvas API types are defined at the top
2. **SlackClient Class**: Handles all Slack API interactions with methods for:
   - Standard operations (send_message, list_channels, etc.)
   - Canvas operations (create_canvas, edit_canvas with 6 operation types)
   - Error handling and pagination support
3. **MCP Server Setup**: Tool handlers that map MCP requests to SlackClient methods

## Testing Approach

Tests use Jest with mocked fetch for API testing. When adding new features:
- Add unit tests to `test/slackClient.test.ts` for new SlackClient methods
- Add integration tests to `test/mcpServer.test.ts` for new MCP tools
- Mock fetch responses should match actual Slack API response structures

## Canvas API Implementation

The Canvas API supports six operations via the `edit_canvas` tool:
- `insert_at_start`, `insert_at_end`: Add content at canvas boundaries
- `insert_after`, `insert_before`: Add content relative to existing sections
- `replace`: Replace entire section content
- `delete`: Remove sections

Canvas content uses Slack's block structure. Section IDs are critical for edit operations.

## Environment Requirements

The server requires `SLACK_BOT_TOKEN` and `SLACK_USER_TOKEN` environment variables. These are validated on startup and the server exits if missing.

## Planned API Extensions

### Files API Implementation
Tools to implement:
- `slack_files_upload`: Upload files to Slack with content and metadata
- `slack_files_list`: List files with filtering options (channel, user, type)
- `slack_files_info`: Get detailed file information
- `slack_files_delete`: Delete files

Key considerations:
- File uploads require multipart/form-data handling
- Support for various file types (images, documents, code)
- File sharing to specific channels during upload

### Search API Implementation
Tools to implement:
- `slack_search_messages`: Search messages across workspace with query syntax
- `slack_search_files`: Search files with filters for type, channel, user

Key considerations:
- Search query syntax support (from:user, in:channel, etc.)
- Pagination for large result sets
- Result ranking and highlighting

### Reminder API Implementation
Tools to implement:
- `slack_reminders_add`: Create reminders for self or others
- `slack_reminders_list`: List active reminders
- `slack_reminders_delete`: Delete specific reminders

Key considerations:
- Natural language time parsing (e.g., "tomorrow at 3pm")
- Reminder targets (self, user, channel)
- Recurring reminder support