# Setup Instructions

## Quick Start Guide

### 1. Build the Project

```bash
cd /projects/slack-canvas-mcp
npm install
npm run build
```

### 2. Configure Slack App

1. **Create Slack App**: Go to https://api.slack.com/apps
2. **Add Bot Token Scopes**:
   ```
   channels:history
   channels:read
   chat:write
   reactions:write
   users:read
   users.profile:read
   canvases:read      # New for Canvas support
   canvases:write     # New for Canvas support
   ```
3. **Install to Workspace** and copy the Bot Token (`xoxb-...`)
4. **Get Team ID** (starts with `T`)

### 3. Configure Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "slack-canvas": {
      "command": "node",
      "args": ["/projects/slack-canvas-mcp/dist/index.js"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-your-actual-token-here",
        "SLACK_TEAM_ID": "T1234567890"
      }
    }
  }
}
```

### 4. Test Canvas Functionality

Once configured, you can use commands like:

- "Create a canvas with project status"
- "Edit the canvas to add a new section"
- "Create a channel canvas for #general"
- "Delete that canvas"

### Canvas Examples

#### Create a Project Canvas
```json
{
  "title": "Q4 Project Status",
  "document_content": {
    "type": "markdown",
    "markdown": "# Q4 Project Status\n\n## 🎯 Goals\n- [ ] Feature A\n- [ ] Feature B\n\n## 📊 Progress\n80% complete"
  }
}
```

#### Edit Canvas (Add Section)
```json
{
  "canvas_id": "F1234567890",
  "changes": [{
    "operation": "insert_at_end",
    "document_content": {
      "type": "markdown",
      "markdown": "\n## 🚀 Next Steps\n1. Final testing\n2. Deploy to production"
    }
  }]
}
```

### Canvas Operations Supported

- **insert_at_start**: Add content at the beginning
- **insert_at_end**: Add content at the end  
- **insert_after**: Add content after specific section
- **insert_before**: Add content before specific section
- **replace**: Replace specific section content
- **delete**: Remove specific section

### Important Notes

- Canvas functionality requires a **paid Slack workspace**
- Free teams can create canvases but need `channel_id` parameter
- Canvas IDs start with `F` (e.g., `F1234567890`)
- Section IDs are needed for relative operations (get them from canvas content)
