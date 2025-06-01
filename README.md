# Slack MCP Server with Canvas Support

Enhanced MCP Server for the Slack API, enabling AI assistants like Claude to interact with Slack workspaces including comprehensive Canvas functionality with dynamic channel support.

## ✨ Key Features

### 🔄 Dynamic Channel Support
- **No static configuration required**: Automatically discovers all public and private channels via API
- **Real-time channel access**: Always up-to-date with your workspace's channel structure
- **Pagination support**: Handles workspaces with hundreds of channels efficiently

### 🎨 Complete Canvas API Support
- **Canvas Creation**: Create standalone and channel-specific canvases
- **Advanced Editing**: 6 different edit operations with full flexibility
- **Access Control**: Granular permissions for users and channels
- **Content Management**: Full lifecycle management from creation to deletion

### 🛠️ Original Slack Features
All original Slack MCP server functionality is preserved and enhanced.

## 📋 Available Tools

### Messaging & Communication
1. `slack_list_channels` - **ENHANCED**: Now fetches all channels dynamically
2. `slack_post_message` - Post messages to any channel
3. `slack_reply_to_thread` - Reply to message threads
4. `slack_add_reaction` - Add emoji reactions
5. `slack_get_channel_history` - Retrieve message history
6. `slack_get_thread_replies` - Get thread conversations
7. `slack_get_users` - List workspace users
8. `slack_get_user_profile` - Get detailed user information

### Canvas Management (NEW)
9. `slack_canvas_create` - Create standalone canvases
10. `slack_canvas_edit` - Edit existing canvases
11. `slack_channel_canvas_create` - Create channel-specific canvases
12. `slack_canvas_get` - Retrieve canvas content
13. `slack_canvas_delete` - Delete canvases
14. `slack_canvas_access_set` - Manage canvas permissions

### File Management (NEW)
15. `slack_files_upload` - Upload files to Slack
16. `slack_files_list` - List files with filtering options
17. `slack_files_info` - Get detailed file information
18. `slack_files_delete` - Delete files from workspace

### Search (NEW)
19. `slack_search_messages` - Search messages across workspace
20. `slack_search_files` - Search files in workspace

### Reminders (NEW)
21. `slack_reminders_add` - Create reminders
22. `slack_reminders_list` - List active reminders
23. `slack_reminders_delete` - Delete reminders

## 🚀 Quick Start

### 1. Installation

```bash
cd slack_mcp_server
npm install
npm run build
```

### 2. Slack App Configuration

1. **Create Slack App**: Visit [Slack Apps](https://api.slack.com/apps)
2. **Configure Bot Token Scopes**:
   ```
   channels:history      # View messages in public channels
   channels:read         # View basic channel information
   chat:write           # Send messages
   reactions:write      # Add emoji reactions
   users:read           # View users and their basic information
   users.profile:read   # View detailed user profiles
   canvases:read        # Access canvas contents
   canvases:write       # Create, edit and remove canvases
   files:read           # View files in workspace
   files:write          # Upload and delete files
   search:read          # Search messages and files
   reminders:read       # View reminders
   reminders:write      # Create and delete reminders
   ```
3. **Install to Workspace** and copy the Bot Token (`xoxb-...`)
4. **Get Team ID** (starts with `T`)

### 3. Claude Desktop Configuration

```json
{
  "mcpServers": {
    "slack": {
      "command": "node",
      "args": ["slack_mcp_server/dist/index.js"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-your-actual-token-here",
        "SLACK_USER_TOKEN": "xoxp-your-user-token-here",
        "SLACK_TEAM_ID": "T1234567890"
      }
    }
  }
}
```

**Notes**: 
- `SLACK_CHANNEL_IDS` is no longer needed! The server now dynamically discovers all channels.
- `SLACK_USER_TOKEN` is required for file uploads, reminders, and some Canvas operations.

## 🎯 Canvas API Examples

### Create a Project Status Canvas

```typescript
{
  "title": "Q1 Project Status",
  "document_content": {
    "type": "markdown",
    "markdown": "# Q1 Project Status\n\n## 🎯 Goals\n- [ ] Launch Feature A\n- [ ] Improve Performance\n\n## 📊 Progress\n75% complete\n\n## 👥 Team\n- @U123456 (Lead)\n- @U789012 (Dev)"
  },
  "channel_id": "C123456789"
}
```

### Edit Canvas with Multiple Operations

```typescript
{
  "canvas_id": "F1234567890",
  "changes": [
    {
      "operation": "insert_at_end",
      "document_content": {
        "type": "markdown",
        "markdown": "\n\n## 🚀 Next Steps\n1. Code review\n2. QA testing\n3. Production deployment"
      }
    },
    {
      "operation": "insert_at_end",
      "document_content": {
        "type": "markdown",
        "markdown": "\n\n## 📅 Timeline\n- **Week 1**: Development\n- **Week 2**: Testing\n- **Week 3**: Launch"
      }
    }
  ]
}
```

### Canvas Markdown Features

Canvas supports rich markdown with Slack-specific elements:

```markdown
# Project Dashboard

## 👥 Team Members
- @U123456 (displays as user card)
- @U789012 (project lead)

## 📢 Channels
- ![](#C123456) - Project Channel (displays as channel link)
- ![](#C789012) - General Discussion

## 📊 Status
:large_green_circle: On Track
:warning: Needs Attention
:red_circle: Blocked

## 📋 Tasks
- [x] Setup repository
- [ ] Implement auth
- [ ] Deploy to staging

## 💻 Code
\`\`\`javascript
const config = {
  apiUrl: 'https://api.example.com'
};
\`\`\`

## 📎 Resources
[Design Doc](https://example.com/design)
```

## 📁 File Management Examples

### Upload a File

```typescript
{
  "content": "# Project Report\n\n## Summary\nQ1 performance exceeded expectations...",
  "filename": "q1-report.md",
  "title": "Q1 2024 Report",
  "initial_comment": "Here's the Q1 report for review",
  "channels": ["C123456789"]
}
```

### Search Files

```typescript
{
  "query": "type:pdf from:U123456",
  "sort": "timestamp",
  "sort_dir": "desc"
}
```

## 🔍 Search Examples

### Search Messages with Operators

```typescript
{
  "query": "from:@alice in:#general has:link during:today",
  "sort": "timestamp",
  "highlight": true
}
```

### Search Query Syntax
- `from:@username` - Messages from specific user
- `in:#channel` - Messages in specific channel  
- `has:link` - Messages containing links
- `has:star` - Starred messages
- `during:today` - Time-based filters
- `"exact phrase"` - Exact phrase matching

## ⏰ Reminder Examples

### Create a Reminder

```typescript
{
  "text": "Review pull requests",
  "time": "tomorrow at 9am"
}
```

### Create Reminder for Another User

```typescript
{
  "text": "Submit timesheet",
  "time": "Friday at 5pm",
  "user": "U789012"
}
```

### Time Formats Supported
- Unix timestamp: `1234567890`
- Natural language: `"in 2 hours"`, `"next Monday"`, `"tomorrow at 3pm"`

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Structure

- **`test/slackClient.test.ts`**: SlackClient class unit tests
- **`test/mcpServer.test.ts`**: MCP server integration tests
- **`test/canvasFeatures.test.ts`**: Canvas API functionality tests
- **`test/filesApi.test.ts`**: Files API functionality tests
- **`test/searchApi.test.ts`**: Search API functionality tests
- **`test/reminderApi.test.ts`**: Reminder API functionality tests
- **`test/e2e.test.ts`**: End-to-end workflow tests

### Coverage Goals

- **80%+ coverage** across all metrics
- **Comprehensive error scenarios** tested
- **Performance tests** for large operations
- **End-to-end workflows** validated

## 🔧 Development

### Project Structure

```
/slack_mcp_server/
├── src/
│   └── index.ts          # Main server implementation
├── test/
│   ├── setup.ts          # Test configuration and mocks
│   ├── slackClient.test.ts
│   ├── mcpServer.test.ts
│   ├── canvasFeatures.test.ts
│   └── e2e.test.ts
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

### Build Commands

```bash
npm run build      # Compile TypeScript
npm run watch      # Watch mode compilation
npm run test       # Run test suite
npm run prepare    # Build for distribution
```

## 🚨 Important Changes from Original

### ✅ What's New
- **Dynamic channel discovery**: No more static channel configuration
- **Complete Canvas API**: Full create, read, update, delete operations
- **File Management API**: Upload, list, view, and delete files
- **Search API**: Search messages and files with advanced query syntax
- **Reminder API**: Create and manage reminders with natural language
- **Enhanced permissions**: Canvas and file access control
- **Comprehensive testing**: 80%+ test coverage with 58 tests
- **Better error handling**: Graceful failure recovery

### ⚠️ Breaking Changes
- **Environment variable removed**: `SLACK_CHANNEL_IDS` is no longer used
- **New permissions required**: Multiple new scopes needed:
  - `canvases:read` and `canvases:write` for Canvas features
  - `files:read` and `files:write` for File management
  - `search:read` for Search functionality
  - `reminders:read` and `reminders:write` for Reminders
- **User token required**: Some features (files, reminders) need `SLACK_USER_TOKEN`
- **Paid workspace requirement**: Canvas features require paid Slack workspace

### 🔒 Backward Compatibility
- All original MCP tools continue to work exactly as before
- Existing Claude Desktop configurations work (just remove `SLACK_CHANNEL_IDS`)
- No changes to existing tool interfaces

## 🐛 Troubleshooting

### Common Issues

1. **Canvas operations fail**
   - Ensure workspace is on a paid Slack plan
   - Verify `canvases:read` and `canvases:write` scopes are added
   - Check that app is installed to workspace

2. **Channel list is empty**
   - Verify `SLACK_TEAM_ID` is correct
   - Ensure bot has access to channels (invite bot to private channels)
   - Check `channels:read` scope is enabled

3. **Permission errors**
   - Confirm all required scopes are added to Slack app
   - Reinstall app to workspace after adding scopes
   - Verify `SLACK_BOT_TOKEN` starts with `xoxb-`

### Debug Mode

Set environment variable for detailed logging:
```bash
DEBUG=slack-mcp:* node dist/index.js
```

## 📄 License

MIT License - Copyright (c) 2024 jfcamel

This project extends the original [Model Context Protocol Servers](https://github.com/modelcontextprotocol/servers) Slack implementation.
See NOTICES file for attribution.

## 🤝 Contributing

1. Follow existing code patterns
2. Add tests for new features
3. Ensure 80%+ test coverage
4. Update documentation
5. Test with real Slack workspace

---

**Ready to transform your Slack workspace management with MCP!** 🎨✨
