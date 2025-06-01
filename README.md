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

### Channel Management (NEW)
24. `slack_conversation_create` - Create new channels (public or private)
25. `slack_conversation_archive` - Archive channels
26. `slack_conversation_unarchive` - Unarchive channels
27. `slack_conversation_invite` - Invite users to channels
28. `slack_conversation_kick` - Remove users from channels
29. `slack_conversation_rename` - Rename channels
30. `slack_conversation_set_purpose` - Set channel purpose
31. `slack_conversation_set_topic` - Set channel topic
32. `slack_conversation_join` - Join a channel
33. `slack_conversation_leave` - Leave a channel

### Pins (NEW)
34. `slack_pins_add` - Pin messages or files to channels
35. `slack_pins_remove` - Unpin items from channels
36. `slack_pins_list` - List all pinned items in a channel

### Extended Reactions (NEW)
37. `slack_reactions_remove` - Remove reactions from messages
38. `slack_reactions_get` - Get all reactions for a specific message
39. `slack_reactions_list` - List items the user has reacted to

### Views/Modals (NEW)
40. `slack_views_open` - Open modal dialogs
41. `slack_views_update` - Update existing modals
42. `slack_views_push` - Push new views onto the modal stack

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
   channels:manage      # Create, archive, rename channels
   chat:write           # Send messages
   reactions:read       # View reactions
   reactions:write      # Add and remove reactions
   users:read           # View users and their basic information
   users.profile:read   # View detailed user profiles
   canvases:read        # Access canvas contents
   canvases:write       # Create, edit and remove canvases
   files:read           # View files in workspace
   files:write          # Upload and delete files
   search:read          # Search messages and files
   reminders:read       # View reminders
   reminders:write      # Create and delete reminders
   pins:read            # View pinned items
   pins:write           # Pin and unpin items
   groups:read          # View private channels
   groups:write         # Manage private channels
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
        "SLACK_TEAM_ID": "T1234567890",
        "SLACK_MCP_LOG_LEVEL": "info"
      }
    }
  }
}
```

**Notes**: 
- `SLACK_CHANNEL_IDS` is no longer needed! The server now dynamically discovers all channels.
- `SLACK_USER_TOKEN` is required for file uploads, reminders, search operations, and some Canvas operations.

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

## 📢 Channel Management Examples

### Create a Channel

```typescript
{
  "name": "project-alpha",
  "is_private": false
}
```

### Invite Users to Channel

```typescript
{
  "channel": "C123456789",
  "users": "U123456,U789012,U345678"
}
```

### Set Channel Topic and Purpose

```typescript
// Set topic
{
  "channel": "C123456789",
  "topic": "Q1 2024 Product Launch 🚀"
}

// Set purpose
{
  "channel": "C123456789",
  "purpose": "Coordinate all activities for the Q1 product launch"
}
```

## 📌 Pins Examples

### Pin a Message

```typescript
{
  "channel": "C123456789",
  "timestamp": "1234567890.123456"
}
```

### List Pinned Items

```typescript
{
  "channel": "C123456789"
}
// Returns both pinned messages and files
```

## 😀 Reactions Examples

### Get All Reactions for a Message

```typescript
{
  "channel": "C123456789",
  "timestamp": "1234567890.123456",
  "full": true  // Get all reactions, not just first 25
}
```

### Remove a Reaction

```typescript
{
  "channel": "C123456789",
  "timestamp": "1234567890.123456",
  "name": "thumbsup"
}
```

## 🪟 Views/Modals Examples

### Open a Modal Dialog

```typescript
{
  "trigger_id": "12345.98765.abcd",
  "view": {
    "type": "modal",
    "title": {
      "type": "plain_text",
      "text": "Feedback Form"
    },
    "blocks": [
      {
        "type": "input",
        "block_id": "feedback_input",
        "element": {
          "type": "plain_text_input",
          "multiline": true,
          "action_id": "feedback"
        },
        "label": {
          "type": "plain_text",
          "text": "Share your feedback"
        }
      }
    ],
    "submit": {
      "type": "plain_text",
      "text": "Submit"
    }
  }
}
```

### Update Modal Content

```typescript
{
  "view_id": "V123456",
  "view": {
    "type": "modal",
    "title": {
      "type": "plain_text",
      "text": "Success!"
    },
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "✅ Your feedback has been submitted successfully!"
        }
      }
    ]
  }
}
```

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
- **`test/conversationApi.test.ts`**: Channel management API tests
- **`test/pinsApi.test.ts`**: Pins API functionality tests
- **`test/reactionsApi.test.ts`**: Extended reactions API tests
- **`test/viewsApi.test.ts`**: Views/Modals API tests
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
- **Channel Management**: Create, archive, rename, and manage channels
- **Pins API**: Pin and unpin messages or files to channels
- **Extended Reactions**: Remove reactions and get detailed reaction data
- **Views/Modals API**: Create interactive modal dialogs
- **Enhanced permissions**: Comprehensive access control
- **Comprehensive logging**: Debug mode with detailed API tracking
- **Comprehensive testing**: 80%+ test coverage with 87 tests
- **Better error handling**: Graceful failure recovery with detailed error logs

### ⚠️ Breaking Changes
- **Environment variable removed**: `SLACK_CHANNEL_IDS` is no longer used
- **New permissions required**: Multiple new scopes needed:
  - `canvases:read` and `canvases:write` for Canvas features
  - `files:read` and `files:write` for File management
  - `search:read` for Search functionality
  - `reminders:read` and `reminders:write` for Reminders
  - `channels:manage` for Channel creation and management
  - `groups:read` and `groups:write` for Private channel management
  - `pins:read` and `pins:write` for Pins functionality
  - `reactions:read` for Extended reactions features
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

4. **Search operations fail with "not_allowed_token_type"**
   - Ensure `SLACK_USER_TOKEN` is set (starts with `xoxp-`)
   - Search APIs require user tokens, not bot tokens
   - User token must have `search:read` scope

## 🔍 Logging and Debugging

The server includes comprehensive logging to help debug issues with API calls.

### Environment Variables

- **`SLACK_MCP_LOG_LEVEL`**: Control logging verbosity
  - `debug` - All logs including debug information
  - `info` (default) - Information, warnings, and errors
  - `warn` - Only warnings and errors
  - `error` - Only errors

### Example Debug Configuration

```json
{
  "mcpServers": {
    "slack": {
      "command": "node",
      "args": ["slack_mcp_server/dist/index.js"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-...",
        "SLACK_USER_TOKEN": "xoxp-...",
        "SLACK_TEAM_ID": "T...",
        "SLACK_MCP_LOG_LEVEL": "debug"
      }
    }
  }
}
```

### Log Output Features

- **Color-coded output** for easy reading
- **Timestamps** for all log entries
- **API request/response details** in debug mode
- **Error stack traces** for troubleshooting
- **Slack API error details** including missing scopes

### Common Debug Scenarios

1. **API Permission Errors**
   ```
   [ERROR] Slack API error: missing_scope
   needed: channels:manage
   provided: channels:read,chat:write
   ```

2. **Network Issues**
   ```
   [ERROR] Network error for POST https://slack.com/api/chat.postMessage
   ```

3. **Tool Execution**
   ```
   [INFO] Tool called: slack_post_message
   [DEBUG] API Request: POST https://slack.com/api/chat.postMessage
   [SUCCESS] Tool slack_post_message completed successfully
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
