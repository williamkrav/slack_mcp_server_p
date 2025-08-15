#!/usr/bin/env node
/**
 * Slack MCP Server with Canvas, Files, Search, and Reminders support
 * Copyright (c) 2024 jfcamel
 * Licensed under the MIT License
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from 'fs/promises';
import * as path from 'path';
import { lookup } from 'mime-types';

// Logging configuration
const LOG_LEVEL = process.env.SLACK_MCP_LOG_LEVEL || 'info';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// Logging utility
class Logger {
  private static shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(LOG_LEVEL);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private static formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const colorMap: { [key: string]: string } = {
      debug: colors.gray,
      info: colors.blue,
      warn: colors.yellow,
      error: colors.red,
      success: colors.green,
    };
    const color = colorMap[level] || colors.reset;
    let output = `${color}[${timestamp}] [${level.toUpperCase()}] ${message}${colors.reset}`;
    if (data !== undefined) {
      output += `\n${colors.gray}${JSON.stringify(data, null, 2)}${colors.reset}`;
    }
    return output;
  }

  static debug(message: string, data?: any) {
    if (this.shouldLog('debug')) {
      console.error(this.formatMessage('debug', message, data));
    }
  }

  static info(message: string, data?: any) {
    if (this.shouldLog('info')) {
      console.error(this.formatMessage('info', message, data));
    }
  }

  static warn(message: string, data?: any) {
    if (this.shouldLog('warn')) {
      console.error(this.formatMessage('warn', message, data));
    }
  }

  static error(message: string, data?: any) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, data));
    }
  }

  static success(message: string, data?: any) {
    if (this.shouldLog('info')) {
      console.error(this.formatMessage('success', message, data));
    }
  }

  static apiRequest(method: string, url: string, body?: any) {
    this.debug(`API Request: ${method} ${url}`, body);
  }

  static apiResponse(method: string, url: string, status: number, body: any) {
    const level = status >= 400 ? 'error' : 'debug';
    const message = `API Response: ${method} ${url} - Status: ${status}`;
    this[level](message, body);
  }
}

// Type definitions for tool arguments
interface ListChannelsArgs {
  limit?: number;
  cursor?: string;
}

interface PostMessageArgs {
  channel_id: string;
  text: string;
}

interface ReplyToThreadArgs {
  channel_id: string;
  thread_ts: string;
  text: string;
}

interface AddReactionArgs {
  channel_id: string;
  timestamp: string;
  reaction: string;
}

interface GetChannelHistoryArgs {
  channel_id: string;
  limit?: number;
}

interface GetThreadRepliesArgs {
  channel_id: string;
  thread_ts: string;
}

interface GetUsersArgs {
  cursor?: string;
  limit?: number;
}

interface GetUserProfileArgs {
  user_id: string;
}

interface UserLookupByEmailArgs {
  email: string;
}

// Canvas API type definitions
interface DocumentContent {
  type: "markdown";
  markdown: string;
}

interface CanvasChange {
  operation: "insert_after" | "insert_before" | "replace" | "delete" | "insert_at_start" | "insert_at_end";
  section_id?: string;
  document_content?: DocumentContent;
}

interface CanvasCreateArgs {
  title?: string;
  document_content?: DocumentContent;
  channel_id?: string;
}

interface CanvasEditArgs {
  canvas_id: string;
  changes: CanvasChange[];
}

interface ChannelCanvasCreateArgs {
  channel_id: string;
  document_content?: DocumentContent;
}

interface CanvasGetArgs {
  canvas_id: string;
}

interface CanvasDeleteArgs {
  canvas_id: string;
}

interface CanvasAccessSetArgs {
  canvas_id: string;
  access_level: "read" | "write" | "none";
  channel_ids?: string[];
  user_ids?: string[];
}

// Files API type definitions
interface FilesUploadArgs {
  content?: string;           // File content (for text files)
  file_path?: string;         // Path to local file to upload
  filename?: string;          // Filename (required if content provided, optional if file_path provided)
  filetype?: string;          // File type (auto-detect if not provided)
  title?: string;             // Title of the file
  initial_comment?: string;   // Message to add about the file
  channels?: string[];        // Channel IDs to share the file
  thread_ts?: string;         // Thread timestamp to upload into
}

interface FilesListArgs {
  channel?: string;     // Filter by channel
  user?: string;        // Filter by user who uploaded
  types?: string;       // Comma-separated file types (e.g., "images,pdfs")
  from?: number;        // Start timestamp (Unix epoch)
  to?: number;          // End timestamp (Unix epoch)
  count?: number;       // Number of items to return (default: 100)
  page?: number;        // Page number for pagination
}

interface FilesInfoArgs {
  file: string;         // File ID
  page?: number;        // Page of comments to return
  count?: number;       // Number of comments per page
}

interface FilesDeleteArgs {
  file: string;         // File ID to delete
}

// New Files API v2 type definitions
interface FilesGetUploadURLExternalArgs {
  filename: string;     // Name of the file
  length: number;       // Size of the file in bytes
  alt_txt?: string;     // Alternative text for the file
}

interface FilesCompleteUploadExternalArgs {
  files: Array<{        // Array of file objects
    id: string;         // File ID from getUploadURLExternal
    title?: string;     // Title of the file
  }>;
  channel_id?: string;  // Channel to share the file to
  initial_comment?: string; // Initial comment about the file
  thread_ts?: string;   // Thread timestamp to share into
}

// Search API type definitions
interface SearchMessagesArgs {
  query: string;        // Search query with operators
  sort?: "score" | "timestamp";  // Sort order (default: score)
  sort_dir?: "asc" | "desc";     // Sort direction
  highlight?: boolean;            // Include highlight markers
  count?: number;                 // Results per page (default: 20)
  page?: number;                  // Page number
}

interface SearchFilesArgs {
  query: string;        // Search query
  sort?: "score" | "timestamp";  // Sort order
  sort_dir?: "asc" | "desc";     // Sort direction
  highlight?: boolean;            // Include highlights
  count?: number;                 // Results per page
  page?: number;                  // Page number
}

// Reminder API type definitions
interface RemindersAddArgs {
  text: string;         // Reminder text
  time: string | number; // When to remind (timestamp or natural language)
  user?: string;        // User to remind (default: self)
}

interface RemindersListArgs {
  user?: string;        // Filter by user (default: self)
}

interface RemindersDeleteArgs {
  reminder: string;     // Reminder ID
}

// Channel/Conversation Management API type definitions
interface ConversationCreateArgs {
  name: string;         // Name of the channel (21 chars max)
  is_private?: boolean; // Create a private channel
  team_id?: string;     // Team ID for Enterprise Grid
}

interface ConversationArchiveArgs {
  channel: string;      // Channel ID to archive
}

interface ConversationUnarchiveArgs {
  channel: string;      // Channel ID to unarchive
}

interface ConversationInviteArgs {
  channel: string;      // Channel ID
  users: string;        // Comma-separated list of user IDs
}

interface ConversationKickArgs {
  channel: string;      // Channel ID
  user: string;         // User ID to remove
}

interface ConversationRenameArgs {
  channel: string;      // Channel ID
  name: string;         // New name for channel
}

interface ConversationSetPurposeArgs {
  channel: string;      // Channel ID
  purpose: string;      // New channel purpose
}

interface ConversationSetTopicArgs {
  channel: string;      // Channel ID
  topic: string;        // New channel topic
}

interface ConversationJoinArgs {
  channel: string;      // Channel ID to join
}

interface ConversationLeaveArgs {
  channel: string;      // Channel ID to leave
}

// Pins API type definitions
interface PinsAddArgs {
  channel: string;      // Channel ID
  timestamp: string;    // Timestamp of message to pin
}

interface PinsRemoveArgs {
  channel: string;      // Channel ID
  timestamp: string;    // Timestamp of message to unpin
}

interface PinsListArgs {
  channel: string;      // Channel ID
}

// Additional Reactions API type definitions
interface ReactionsRemoveArgs {
  channel: string;      // Channel ID
  timestamp: string;    // Message timestamp
  name: string;         // Reaction name (without ::)
}

interface ReactionsGetArgs {
  channel: string;      // Channel ID
  timestamp: string;    // Message timestamp
  full?: boolean;       // Return all reactions (not just 25)
}

interface ReactionsListArgs {
  count?: number;       // Number of items per page
  page?: number;        // Page number
  full?: boolean;       // Return all reactions
}

// Views API type definitions
interface ViewsOpenArgs {
  trigger_id: string;   // Trigger ID from interaction
  view: {               // View payload
    type: "modal";
    title: {
      type: "plain_text";
      text: string;
    };
    blocks: any[];      // Block kit blocks
    submit?: {
      type: "plain_text";
      text: string;
    };
    close?: {
      type: "plain_text";
      text: string;
    };
    callback_id?: string;
  };
}

interface ViewsUpdateArgs {
  view_id: string;      // View ID to update
  view: {               // Updated view payload
    type: "modal";
    title: {
      type: "plain_text";
      text: string;
    };
    blocks: any[];
  };
  hash?: string;        // Hash for conflict detection
}

interface ViewsPushArgs {
  trigger_id: string;   // Trigger ID
  view: {               // View to push
    type: "modal";
    title: {
      type: "plain_text";
      text: string;
    };
    blocks: any[];
  };
}

// Existing tool definitions
const listChannelsTool: Tool = {
  name: "slack_list_channels",
  description: "List public and private channels in the workspace with pagination",
  inputSchema: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        description: "Maximum number of channels to return (default 100, max 200)",
        default: 100,
        minimum: 1,
        maximum: 200,
      },
      cursor: {
        type: "string",
        description: "Pagination cursor for next page of results",
      },
    },
  },
};

const postMessageTool: Tool = {
  name: "slack_post_message",
  description: "Post a new message to a Slack channel",
  inputSchema: {
    type: "object",
    properties: {
      channel_id: {
        type: "string",
        description: "The ID of the channel to post to",
      },
      text: {
        type: "string",
        description: "The message text to post",
        minLength: 1,
      },
    },
    required: ["channel_id", "text"],
  },
};

const replyToThreadTool: Tool = {
  name: "slack_reply_to_thread",
  description: "Reply to a specific message thread in Slack",
  inputSchema: {
    type: "object",
    properties: {
      channel_id: {
        type: "string",
        description: "The ID of the channel containing the thread",
      },
      thread_ts: {
        type: "string",
        description: "The timestamp of the parent message in the format '1234567890.123456'. Timestamps in the format without the period can be converted by adding the period such that 6 numbers come after it.",
      },
      text: {
        type: "string",
        description: "The reply text",
        minLength: 1,
      },
    },
    required: ["channel_id", "thread_ts", "text"],
  },
};

const addReactionTool: Tool = {
  name: "slack_add_reaction",
  description: "Add a reaction emoji to a message",
  inputSchema: {
    type: "object",
    properties: {
      channel_id: {
        type: "string",
        description: "The ID of the channel containing the message",
      },
      timestamp: {
        type: "string",
        description: "The timestamp of the message to react to",
      },
      reaction: {
        type: "string",
        description: "The name of the emoji reaction (without ::)",
      },
    },
    required: ["channel_id", "timestamp", "reaction"],
  },
};

const getChannelHistoryTool: Tool = {
  name: "slack_get_channel_history",
  description: "Get recent messages from a channel",
  inputSchema: {
    type: "object",
    properties: {
      channel_id: {
        type: "string",
        description: "The ID of the channel",
      },
      limit: {
        type: "number",
        description: "Number of messages to retrieve (default 10)",
        default: 10,
        minimum: 1,
        maximum: 1000,
      },
    },
    required: ["channel_id"],
  },
};

const getThreadRepliesTool: Tool = {
  name: "slack_get_thread_replies",
  description: "Get all replies in a message thread",
  inputSchema: {
    type: "object",
    properties: {
      channel_id: {
        type: "string",
        description: "The ID of the channel containing the thread",
      },
      thread_ts: {
        type: "string",
        description: "The timestamp of the parent message in the format '1234567890.123456'. Timestamps in the format without the period can be converted by adding the period such that 6 numbers come after it.",
      },
    },
    required: ["channel_id", "thread_ts"],
  },
};

const getUsersTool: Tool = {
  name: "slack_get_users",
  description:
  "Get a list of all users in the workspace with their basic profile information",
  inputSchema: {
    type: "object",
    properties: {
      cursor: {
        type: "string",
        description: "Pagination cursor for next page of results",
      },
      limit: {
        type: "number",
        description: "Maximum number of users to return (default 100, max 200)",
        default: 100,
        minimum: 1,
        maximum: 200,
      },
    },
  },
};

const getUserProfileTool: Tool = {
  name: "slack_get_user_profile",
  description: "Get detailed profile information for a specific user",
  inputSchema: {
    type: "object",
    properties: {
      user_id: {
        type: "string",
        description: "The ID of the user",
      },
    },
    required: ["user_id"],
  },
};

const userLookupByEmailTool: Tool = {
  name: "slack_user_email",
  description: "Look up a user by their email address",
  inputSchema: {
    type: "object",
    properties: {
      email: {
        type: "string",
        description: "The email address of the user to look up",
        format: "email",
        minLength: 1,
      },
    },
    required: ["email"],
  },
};

// Canvas API tool definitions
const canvasCreateTool: Tool = {
  name: "slack_canvas_create",
  description: "Create a new standalone canvas",
  inputSchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Canvas title (optional)",
      },
      document_content: {
        type: "object",
        description: "Initial canvas content",
        properties: {
          type: {
            type: "string",
            enum: ["markdown"],
            description: "Content type (currently only markdown is supported)",
          },
          markdown: {
            type: "string",
            description: "Markdown content for the canvas",
          },
        },
        required: ["type", "markdown"],
      },
      channel_id: {
        type: "string",
        description: "Channel ID to tab the canvas in (required for free teams)",
      },
    },
  },
};

const canvasEditTool: Tool = {
  name: "slack_canvas_edit",
  description: "Edit an existing canvas with specified changes",
  inputSchema: {
    type: "object",
    properties: {
      canvas_id: {
        type: "string",
        description: "Canvas ID to edit",
      },
      changes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            operation: {
              type: "string",
              enum: ["insert_after", "insert_before", "replace", "delete", "insert_at_start", "insert_at_end"],
              description: "The operation to perform",
            },
            section_id: {
              type: "string",
              description: "Section ID for relative operations (required for insert_after, insert_before, replace, delete)",
            },
            document_content: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["markdown"],
                },
                markdown: {
                  type: "string",
                },
              },
              required: ["type", "markdown"],
            },
          },
          required: ["operation"],
        },
        description: "Array of changes to apply to the canvas",
      },
    },
    required: ["canvas_id", "changes"],
  },
};

const channelCanvasCreateTool: Tool = {
  name: "slack_channel_canvas_create",
  description: "Create a canvas for a specific channel",
  inputSchema: {
    type: "object",
    properties: {
      channel_id: {
        type: "string",
        description: "Channel ID to create the canvas for",
      },
      document_content: {
        type: "object",
        description: "Initial canvas content",
        properties: {
          type: {
            type: "string",
            enum: ["markdown"],
          },
          markdown: {
            type: "string",
          },
        },
        required: ["type", "markdown"],
      },
    },
    required: ["channel_id"],
  },
};

const canvasGetTool: Tool = {
  name: "slack_canvas_get",
  description: "Get the content of a specific canvas",
  inputSchema: {
    type: "object",
    properties: {
      canvas_id: {
        type: "string",
        description: "Canvas ID to retrieve",
      },
    },
    required: ["canvas_id"],
  },
};

const canvasDeleteTool: Tool = {
  name: "slack_canvas_delete",
  description: "Delete a canvas (cannot be undone)",
  inputSchema: {
    type: "object",
    properties: {
      canvas_id: {
        type: "string",
        description: "Canvas ID to delete",
      },
    },
    required: ["canvas_id"],
  },
};

const canvasAccessSetTool: Tool = {
  name: "slack_canvas_access_set",
  description: "Set access permissions for a canvas",
  inputSchema: {
    type: "object",
    properties: {
      canvas_id: {
        type: "string",
        description: "Canvas ID to modify access for",
      },
      access_level: {
        type: "string",
        enum: ["read", "write", "none"],
        description: "Access level to grant",
      },
      channel_ids: {
        type: "array",
        items: {
          type: "string"
        },
        description: "List of channel IDs to grant access to (cannot be used with user_ids)",
      },
      user_ids: {
        type: "array",
        items: {
          type: "string"
        },
        description: "List of user IDs to grant access to (cannot be used with channel_ids)",
      },
    },
    required: ["canvas_id", "access_level"],
  },
};

// Files API tool definitions
const filesUploadTool: Tool = {
  name: "slack_files_upload",
  description: "Upload a file to Slack",
  inputSchema: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description: "File content (for text files)",
      },
      filename: {
        type: "string",
        description: "Name of the file",
        minLength: 1,
      },
      filetype: {
        type: "string",
        description: "Type of file (e.g., 'text', 'javascript', 'python')",
      },
      title: {
        type: "string",
        description: "Title of the file",
      },
      initial_comment: {
        type: "string",
        description: "Initial comment to add about the file",
      },
      channels: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Channel IDs where the file will be shared",
      },
      thread_ts: {
        type: "string",
        description: "Thread timestamp to upload file to",
      },
    },
    required: ["content", "filename"],
  },
};

// New Files API v2 tool definitions
const filesGetUploadURLExternalTool: Tool = {
  name: "slack_files_getUploadURLExternal",
  description: "Get an upload URL for uploading a file to Slack (step 1 of v2 upload flow)",
  inputSchema: {
    type: "object",
    properties: {
      filename: {
        type: "string",
        description: "Name of the file to upload",
        minLength: 1,
      },
      length: {
        type: "number",
        description: "Size of the file in bytes",
        minimum: 1,
      },
      alt_txt: {
        type: "string",
        description: "Alternative text for the file",
      },
    },
    required: ["filename", "length"],
  },
};

const filesCompleteUploadExternalTool: Tool = {
  name: "slack_files_completeUploadExternal",
  description: "Complete the file upload process (step 2 of v2 upload flow)",
  inputSchema: {
    type: "object",
    properties: {
      files: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "File ID from getUploadURLExternal",
            },
            title: {
              type: "string",
              description: "Title of the file",
            },
          },
          required: ["id"],
        },
        description: "Array of file objects to complete upload for",
      },
      channel_id: {
        type: "string",
        description: "Channel ID to share the file to",
      },
      initial_comment: {
        type: "string",
        description: "Initial comment about the file",
      },
      thread_ts: {
        type: "string",
        description: "Thread timestamp to share into",
      },
    },
    required: ["files"],
  },
};

const filesUploadV2Tool: Tool = {
  name: "slack_files_upload_v2",
  description: "Upload a file to Slack using the new v2 API (recommended). Supports both file paths and direct content.",
  inputSchema: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Path to local file to upload. If provided, content and filename are optional.",
      },
      content: {
        type: "string",
        description: "File content (for text files). Required if file_path is not provided.",
      },
      filename: {
        type: "string",
        description: "Name of the file. Required if content is provided, optional if file_path is provided.",
      },
      filetype: {
        type: "string",
        description: "Type of file (e.g., 'text', 'javascript', 'python'). Auto-detected for file_path.",
      },
      title: {
        type: "string",
        description: "Title of the file",
      },
      initial_comment: {
        type: "string",
        description: "Initial comment to add about the file",
      },
      channels: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Channel IDs where the file will be shared",
      },
      thread_ts: {
        type: "string",
        description: "Thread timestamp to upload file to",
      },
    },
  },
};

const filesListTool: Tool = {
  name: "slack_files_list",
  description: "List files in the workspace",
  inputSchema: {
    type: "object",
    properties: {
      channel: {
        type: "string",
        description: "Filter files by channel",
      },
      user: {
        type: "string",
        description: "Filter files by user who uploaded",
      },
      types: {
        type: "string",
        description: "Filter files by type (e.g., 'images,pdfs')",
      },
      from: {
        type: "number",
        description: "Filter files created after this timestamp",
      },
      to: {
        type: "number",
        description: "Filter files created before this timestamp",
      },
      count: {
        type: "number",
        description: "Number of items to return per page (default: 100)",
        default: 100,
        minimum: 1,
        maximum: 1000,
      },
      page: {
        type: "number",
        description: "Page number of results to return",
        default: 1,
        minimum: 1,
      },
    },
  },
};

const filesInfoTool: Tool = {
  name: "slack_files_info",
  description: "Get information about a file",
  inputSchema: {
    type: "object",
    properties: {
      file: {
        type: "string",
        description: "File ID",
      },
      page: {
        type: "number",
        description: "Page number of comments to return",
        minimum: 1,
        default: 1,
      },
      count: {
        type: "number",
        description: "Number of comments per page",
        minimum: 1,
        maximum: 1000,
        default: 100,
      },
    },
    required: ["file"],
  },
};

const filesDeleteTool: Tool = {
  name: "slack_files_delete",
  description: "Delete a file",
  inputSchema: {
    type: "object",
    properties: {
      file: {
        type: "string",
        description: "File ID to delete",
      },
    },
    required: ["file"],
  },
};

// Search API tool definitions
const searchMessagesTool: Tool = {
  name: "slack_search_messages",
  description: "Search for messages in the workspace",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query (supports operators like from:user, in:channel)",
        minLength: 1,
      },
      sort: {
        type: "string",
        enum: ["score", "timestamp"],
        description: "Sort order for results",
        default: "score",
      },
      sort_dir: {
        type: "string",
        enum: ["asc", "desc"],
        description: "Sort direction",
        default: "desc",
      },
      highlight: {
        type: "boolean",
        description: "Include highlight markers in results",
        default: true,
      },
      count: {
        type: "number",
        description: "Number of items to return per page",
        default: 20,
        minimum: 1,
        maximum: 100,
      },
      page: {
        type: "number",
        description: "Page number of results to return",
        default: 1,
        minimum: 1,
      },
    },
    required: ["query"],
  },
};

const searchFilesTool: Tool = {
  name: "slack_search_files",
  description: "Search for files in the workspace",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query for files",
        minLength: 1,
      },
      sort: {
        type: "string",
        enum: ["score", "timestamp"],
        description: "Sort order for results",
        default: "score",
      },
      sort_dir: {
        type: "string",
        enum: ["asc", "desc"],
        description: "Sort direction",
        default: "desc",
      },
      highlight: {
        type: "boolean",
        description: "Include highlight markers in results",
        default: true,
      },
      count: {
        type: "number",
        description: "Number of items to return per page",
        default: 20,
        minimum: 1,
        maximum: 100,
      },
      page: {
        type: "number",
        description: "Page number of results to return",
        default: 1,
        minimum: 1,
      },
    },
    required: ["query"],
  },
};

// Reminder API tool definitions
const remindersAddTool: Tool = {
  name: "slack_reminders_add",
  description: "Create a reminder",
  inputSchema: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "The content of the reminder",
        minLength: 1,
      },
      time: {
        oneOf: [
          {
            type: "string",
            description: "Natural language time description (e.g., 'tomorrow at 3pm', 'in 2 hours')"
          },
          {
            type: "number",
            description: "Unix timestamp"
          }
        ],
        description: "When to send the reminder (Unix timestamp or natural language like 'tomorrow at 3pm')",
      },
      user: {
        type: "string",
        description: "User ID to send the reminder to (defaults to the user who created it)",
      },
    },
    required: ["text", "time"],
  },
};

const remindersListTool: Tool = {
  name: "slack_reminders_list",
  description: "List all reminders",
  inputSchema: {
    type: "object",
    properties: {
      user: {
        type: "string",
        description: "Filter reminders by user",
      },
    },
  },
};

const remindersDeleteTool: Tool = {
  name: "slack_reminders_delete",
  description: "Delete a reminder",
  inputSchema: {
    type: "object",
    properties: {
      reminder: {
        type: "string",
        description: "The ID of the reminder to delete",
      },
    },
    required: ["reminder"],
  },
};

// Channel/Conversation Management tool definitions
const conversationCreateTool: Tool = {
  name: "slack_conversation_create",
  description: "Create a new channel",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Name of the channel to create (max 21 characters, lowercase)",
        minLength: 1,
        maxLength: 21,
        pattern: "^[a-z0-9_-]+$",
      },
      is_private: {
        type: "boolean",
        description: "Create as a private channel",
        default: false,
      },
      team_id: {
        type: "string",
        description: "Team ID for Enterprise Grid",
      },
    },
    required: ["name"],
  },
};

const conversationArchiveTool: Tool = {
  name: "slack_conversation_archive",
  description: "Archive a channel",
  inputSchema: {
    type: "object",
    properties: {
      channel: {
        type: "string",
        description: "Channel ID to archive",
      },
    },
    required: ["channel"],
  },
};

const conversationUnarchiveTool: Tool = {
  name: "slack_conversation_unarchive",
  description: "Unarchive a channel",
  inputSchema: {
    type: "object",
    properties: {
      channel: {
        type: "string",
        description: "Channel ID to unarchive",
      },
    },
    required: ["channel"],
  },
};

const conversationInviteTool: Tool = {
  name: "slack_conversation_invite",
  description: "Invite users to a channel",
  inputSchema: {
    type: "object",
    properties: {
      channel: {
        type: "string",
        description: "Channel ID",
      },
      users: {
        type: "string",
        description: "Comma-separated list of user IDs to invite",
      },
    },
    required: ["channel", "users"],
  },
};

const conversationKickTool: Tool = {
  name: "slack_conversation_kick",
  description: "Remove a user from a channel",
  inputSchema: {
    type: "object",
    properties: {
      channel: {
        type: "string",
        description: "Channel ID",
      },
      user: {
        type: "string",
        description: "User ID to remove",
      },
    },
    required: ["channel", "user"],
  },
};

const conversationRenameTool: Tool = {
  name: "slack_conversation_rename",
  description: "Rename a channel",
  inputSchema: {
    type: "object",
    properties: {
      channel: {
        type: "string",
        description: "Channel ID",
      },
      name: {
        type: "string",
        description: "New name for the channel",
      },
    },
    required: ["channel", "name"],
  },
};

const conversationSetPurposeTool: Tool = {
  name: "slack_conversation_set_purpose",
  description: "Set the purpose of a channel",
  inputSchema: {
    type: "object",
    properties: {
      channel: {
        type: "string",
        description: "Channel ID",
      },
      purpose: {
        type: "string",
        description: "New channel purpose",
      },
    },
    required: ["channel", "purpose"],
  },
};

const conversationSetTopicTool: Tool = {
  name: "slack_conversation_set_topic",
  description: "Set the topic of a channel",
  inputSchema: {
    type: "object",
    properties: {
      channel: {
        type: "string",
        description: "Channel ID",
      },
      topic: {
        type: "string",
        description: "New channel topic",
      },
    },
    required: ["channel", "topic"],
  },
};

const conversationJoinTool: Tool = {
  name: "slack_conversation_join",
  description: "Join a channel",
  inputSchema: {
    type: "object",
    properties: {
      channel: {
        type: "string",
        description: "Channel ID to join",
      },
    },
    required: ["channel"],
  },
};

const conversationLeaveTool: Tool = {
  name: "slack_conversation_leave",
  description: "Leave a channel",
  inputSchema: {
    type: "object",
    properties: {
      channel: {
        type: "string",
        description: "Channel ID to leave",
      },
    },
    required: ["channel"],
  },
};

// Pins API tool definitions
const pinsAddTool: Tool = {
  name: "slack_pins_add",
  description: "Pin a message to a channel",
  inputSchema: {
    type: "object",
    properties: {
      channel: {
        type: "string",
        description: "Channel ID",
      },
      timestamp: {
        type: "string",
        description: "Timestamp of the message to pin",
      },
    },
    required: ["channel", "timestamp"],
  },
};

const pinsRemoveTool: Tool = {
  name: "slack_pins_remove",
  description: "Remove a pinned message from a channel",
  inputSchema: {
    type: "object",
    properties: {
      channel: {
        type: "string",
        description: "Channel ID",
      },
      timestamp: {
        type: "string",
        description: "Timestamp of the message to unpin",
      },
    },
    required: ["channel", "timestamp"],
  },
};

const pinsListTool: Tool = {
  name: "slack_pins_list",
  description: "List all pinned items in a channel",
  inputSchema: {
    type: "object",
    properties: {
      channel: {
        type: "string",
        description: "Channel ID",
      },
    },
    required: ["channel"],
  },
};

// Additional Reactions API tool definitions
const reactionsRemoveTool: Tool = {
  name: "slack_reactions_remove",
  description: "Remove a reaction from a message",
  inputSchema: {
    type: "object",
    properties: {
      channel: {
        type: "string",
        description: "Channel ID containing the message",
      },
      timestamp: {
        type: "string",
        description: "Timestamp of the message",
      },
      name: {
        type: "string",
        description: "Reaction name to remove (without colons)",
      },
    },
    required: ["channel", "timestamp", "name"],
  },
};

const reactionsGetTool: Tool = {
  name: "slack_reactions_get",
  description: "Get reactions for a message",
  inputSchema: {
    type: "object",
    properties: {
      channel: {
        type: "string",
        description: "Channel ID containing the message",
      },
      timestamp: {
        type: "string",
        description: "Timestamp of the message",
      },
      full: {
        type: "boolean",
        description: "Return all reactions (not just first 25)",
        default: false,
      },
    },
    required: ["channel", "timestamp"],
  },
};

const reactionsListTool: Tool = {
  name: "slack_reactions_list",
  description: "List all items reacted to by the user",
  inputSchema: {
    type: "object",
    properties: {
      count: {
        type: "number",
        description: "Number of items per page",
        default: 100,
        minimum: 1,
        maximum: 1000,
      },
      page: {
        type: "number",
        description: "Page number",
        default: 1,
        minimum: 1,
      },
      full: {
        type: "boolean",
        description: "Return all reactions for each item",
        default: false,
      },
    },
  },
};

// Views API tool definitions
const viewsOpenTool: Tool = {
  name: "slack_views_open",
  description: "Open a modal dialog",
  inputSchema: {
    type: "object",
    properties: {
      trigger_id: {
        type: "string",
        description: "Trigger ID from user interaction",
      },
      view: {
        type: "object",
        description: "Modal view definition",
        properties: {
          type: {
            type: "string",
            enum: ["modal"],
          },
          title: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["plain_text"],
              },
              text: {
                type: "string",
              },
            },
            required: ["type", "text"],
          },
          blocks: {
            type: "array",
            items: {
              type: "object"
            },
            description: "Block Kit blocks",
          },
          submit: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["plain_text"],
              },
              text: {
                type: "string",
              },
            },
          },
          close: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["plain_text"],
              },
              text: {
                type: "string",
              },
            },
          },
          callback_id: {
            type: "string",
          },
        },
        required: ["type", "title", "blocks"],
      },
    },
    required: ["trigger_id", "view"],
  },
};

const viewsUpdateTool: Tool = {
  name: "slack_views_update",
  description: "Update an existing modal",
  inputSchema: {
    type: "object",
    properties: {
      view_id: {
        type: "string",
        description: "ID of the view to update",
      },
      view: {
        type: "object",
        description: "Updated view definition",
        properties: {
          type: {
            type: "string",
            enum: ["modal"],
          },
          title: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["plain_text"],
              },
              text: {
                type: "string",
              },
            },
            required: ["type", "text"],
          },
          blocks: {
            type: "array",
            items: {
              type: "object"
            },
            description: "Block Kit blocks",
          },
        },
        required: ["type", "title", "blocks"],
      },
      hash: {
        type: "string",
        description: "Hash for conflict detection",
      },
    },
    required: ["view_id", "view"],
  },
};

const viewsPushTool: Tool = {
  name: "slack_views_push",
  description: "Push a new view onto the modal stack",
  inputSchema: {
    type: "object",
    properties: {
      trigger_id: {
        type: "string",
        description: "Trigger ID from user interaction",
      },
      view: {
        type: "object",
        description: "View to push",
        properties: {
          type: {
            type: "string",
            enum: ["modal"],
          },
          title: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["plain_text"],
              },
              text: {
                type: "string",
              },
            },
            required: ["type", "text"],
          },
          blocks: {
            type: "array",
            items: {
              type: "object"
            },
            description: "Block Kit blocks",
          },
        },
        required: ["type", "title", "blocks"],
      },
    },
    required: ["trigger_id", "view"],
  },
};

class SlackClient {
  private botHeaders: { Authorization: string; "Content-Type": string };
  private userHeaders: { Authorization: string; "Content-Type": string };

  constructor(botToken: string) {
    this.botHeaders = {
      Authorization: `Bearer ${botToken}`,
      "Content-Type": "application/json;charset=utf-8",
    };

    const userToken = process.env.SLACK_USER_TOKEN;
    this.userHeaders = {
      Authorization: `Bearer ${userToken}`,
      "Content-Type": "application/json;charset=utf-8",
    };
  }

  // Helper method for making API requests with logging
  private async makeApiRequest(
    url: string,
    options: RequestInit,
    useUserToken: boolean = false
  ): Promise<any> {
    const method = options.method || 'GET';
    const headers = useUserToken ? this.userHeaders : this.botHeaders;

    // Log the request
    Logger.apiRequest(method, url, options.body ? JSON.parse(options.body as string) : undefined);

    try {
      const response = await fetch(url, {
        ...options,
        headers: options.headers || headers,
      });

      const responseBody = await response.json();

      // Log the response
      Logger.apiResponse(method, url, response.status, responseBody);

      // Check for Slack API errors
      if (!responseBody.ok) {
        Logger.error(`Slack API error for ${method} ${url}`, {
          error: responseBody.error,
          needed: responseBody.needed,
          provided: responseBody.provided,
          warning: responseBody.warning,
          response_metadata: responseBody.response_metadata,
        });
      }

      return responseBody;
    } catch (error) {
      Logger.error(`Network error for ${method} ${url}`, error);
      throw error;
    }
  }

  async getChannels(limit: number = 100, cursor?: string): Promise<any> {
    Logger.debug('Getting channels', { limit, cursor });

    const params = new URLSearchParams({
      types: "public_channel,private_channel",
      exclude_archived: "true",
      limit: Math.min(limit, 200).toString(),
      team_id: process.env.SLACK_TEAM_ID!,
    });

    if (cursor) {
      params.append("cursor", cursor);
    }

    return this.makeApiRequest(
      `https://slack.com/api/conversations.list?${params}`,
      { method: 'GET' }
    );
  }

  async postMessage(channel_id: string, text: string): Promise<any> {
    Logger.debug('Posting message', { channel_id, text_length: text.length });

    return this.makeApiRequest(
      "https://slack.com/api/chat.postMessage",
      {
        method: "POST",
        body: JSON.stringify({
          channel: channel_id,
          text: text,
        }),
      }
    );
  }

  async postReply(
    channel_id: string,
    thread_ts: string,
    text: string,
  ): Promise<any> {
    Logger.debug('Posting reply to thread', { channel_id, thread_ts, text_length: text.length });

    return this.makeApiRequest(
      "https://slack.com/api/chat.postMessage",
      {
        method: "POST",
        body: JSON.stringify({
          channel: channel_id,
          thread_ts: thread_ts,
          text: text,
        }),
      }
    );
  }

  async addReaction(
    channel_id: string,
    timestamp: string,
    reaction: string,
  ): Promise<any> {
    Logger.debug('Adding reaction', { channel_id, timestamp, reaction });

    return this.makeApiRequest(
      "https://slack.com/api/reactions.add",
      {
        method: "POST",
        body: JSON.stringify({
          channel: channel_id,
          timestamp: timestamp,
          name: reaction,
        }),
      }
    );
  }

  async getChannelHistory(
    channel_id: string,
    limit: number = 10,
  ): Promise<any> {
    Logger.debug('Getting channel history', { channel_id, limit });

    const params = new URLSearchParams({
      channel: channel_id,
      limit: limit.toString(),
    });

    return this.makeApiRequest(
      `https://slack.com/api/conversations.history?${params}`,
      { method: 'GET' }
    );
  }

  async getThreadReplies(channel_id: string, thread_ts: string): Promise<any> {
    Logger.debug('Getting thread replies', { channel_id, thread_ts });

    const params = new URLSearchParams({
      channel: channel_id,
      ts: thread_ts,
    });

    return this.makeApiRequest(
      `https://slack.com/api/conversations.replies?${params}`,
      { method: 'GET' }
    );
  }

  async getUsers(limit: number = 100, cursor?: string): Promise<any> {
    Logger.debug('Getting users', { limit, cursor });

    const params = new URLSearchParams({
      limit: Math.min(limit, 200).toString(),
      team_id: process.env.SLACK_TEAM_ID!,
    });

    
    if (cursor) {
      params.append("cursor", cursor);
    }
    
    const ret = this.makeApiRequest(
      `https://slack.com/api/users.list?${params}`,
      { method: 'GET' }
    );

    Logger.debug('ret', ret);
    return ret;
  }

  async getUserProfile(user_id: string): Promise<any> {
    Logger.debug('Getting user profile', { user_id });

    const params = new URLSearchParams({
      user: user_id,
      include_labels: "true",
    });

    return this.makeApiRequest(
      `https://slack.com/api/users.profile.get?${params}`,
      { method: 'GET' }
    );
  }

  async getUserByEmail(email: string): Promise<any> {
    Logger.debug('Looking up user by email', { email });

    return this.makeApiRequest(
      "https://slack.com/api/users.lookupByEmail?email=" + email,
      { method: 'GET' }
    );
  }

  // Canvas API methods
  async createCanvas(title?: string, document_content?: DocumentContent, channel_id?: string): Promise<any> {
    Logger.debug('Creating canvas', { title, has_content: !!document_content, channel_id });

    const payload: any = {};

    if (title) {
      payload.title = title;
    }

    if (document_content) {
      payload.document_content = document_content;
    }

    if (channel_id) {
      payload.channel_id = channel_id;
    }

    return this.makeApiRequest(
      "https://slack.com/api/canvases.create",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }

  async editCanvas(canvas_id: string, changes: any[]): Promise<any> {
    Logger.debug('Editing canvas', { canvas_id, changes_count: changes.length });
    const changeObj:string = JSON.stringify({
      canvas_id: canvas_id,
      changes: changes,
    })
    Logger.debug('changeObj', changeObj);


    return this.makeApiRequest(
      "https://slack.com/api/canvases.edit",
      {
        method: "POST",
        body: changeObj
      }
    );
  }

  async createChannelCanvas(channel_id: string, document_content?: DocumentContent): Promise<any> {
    Logger.debug('Creating channel canvas', { channel_id, has_content: !!document_content });

    const payload: any = {
      channel_id: channel_id,
    };

    if (document_content) {
      payload.document_content = document_content;
    }

    return this.makeApiRequest(
      "https://slack.com/api/conversations.canvases.create",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }

  async getCanvas(canvas_id: string): Promise<any> {
    Logger.debug('Getting canvas', { canvas_id });

    const params = new URLSearchParams({
      canvas_id: canvas_id,
    });
    const body = JSON.stringify({
      canvas_id: canvas_id,
      criteria: {
        section_types: ["any_header"]
      }
    });

    return this.makeApiRequest(
      `https://slack.com/api/canvases.sections.lookup?${params}`,
      { method: 'POST', body: body }
    );
  }

  async deleteCanvas(canvas_id: string): Promise<any> {
    Logger.debug('Deleting canvas', { canvas_id });

    return this.makeApiRequest(
      "https://slack.com/api/canvases.delete",
      {
        method: "POST",
        body: JSON.stringify({
          canvas_id: canvas_id,
        }),
      }
    );
  }

  async setCanvasAccess(canvas_id: string, access_level: string, channel_ids?: string[], user_ids?: string[]): Promise<any> {
    Logger.debug('Setting canvas access', { canvas_id, access_level, channel_ids, user_ids });

    const payload: any = {
      canvas_id: canvas_id,
      access_level: access_level,
    };

    if (channel_ids) {
      payload.channel_ids = channel_ids;
    }

    if (user_ids) {
      payload.user_ids = user_ids;
    }

    return this.makeApiRequest(
      "https://slack.com/api/canvases.access.set",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }

  // Files API methods
  async uploadFile(args: FilesUploadArgs): Promise<any> {
    Logger.debug('Uploading file', { filename: args.filename, filetype: args.filetype, channels: args.channels });

    const formData = new FormData();

    if (args.content) {
      formData.append("content", args.content);
    }
    if (args.filename) {
      formData.append("filename", args.filename);
    }
    if (args.filetype) {
      formData.append("filetype", args.filetype);
    }
    if (args.title) {
      formData.append("title", args.title);
    }
    if (args.initial_comment) {
      formData.append("initial_comment", args.initial_comment);
    }
    if (args.channels) {
      formData.append("channels", args.channels.join(","));
    }
    if (args.thread_ts) {
      formData.append("thread_ts", args.thread_ts);
    }

    // Note: This uses FormData, so we need to pass custom headers
    return this.makeApiRequest(
      "https://slack.com/api/files.upload",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SLACK_USER_TOKEN}`,
        },
        body: formData,
      },
      true  // useUserToken
    );
  }

  async listFiles(args: FilesListArgs): Promise<any> {
    Logger.debug('Listing files', args);

    const params = new URLSearchParams();

    if (args.channel) params.append("channel", args.channel);
    if (args.user) params.append("user", args.user);
    if (args.types) params.append("types", args.types);
    if (args.from) params.append("ts_from", args.from.toString());
    if (args.to) params.append("ts_to", args.to.toString());
    if (args.count) params.append("count", args.count.toString());
    if (args.page) params.append("page", args.page.toString());

    return this.makeApiRequest(
      `https://slack.com/api/files.list?${params}`,
      { method: 'GET' }
    );
  }

  async getFileInfo(args: FilesInfoArgs): Promise<any> {
    Logger.debug('Getting file info', { file: args.file });

    const params = new URLSearchParams({
      file: args.file,
    });

    if (args.page) params.append("page", args.page.toString());
    if (args.count) params.append("count", args.count.toString());

    return this.makeApiRequest(
      `https://slack.com/api/files.info?${params}`,
      { method: 'GET' }
    );
  }

  async deleteFile(args: FilesDeleteArgs): Promise<any> {
    Logger.debug('Deleting file', { file: args.file });

    return this.makeApiRequest(
      "https://slack.com/api/files.delete",
      {
        method: "POST",
        body: JSON.stringify({
          file: args.file,
        }),
      },
      true  // useUserToken
    );
  }

  // New Files API v2 methods
  async getUploadURLExternal(args: FilesGetUploadURLExternalArgs): Promise<any> {
    Logger.debug('Getting upload URL', { filename: args.filename, length: args.length });

    return this.makeApiRequest(
      "https://slack.com/api/files.getUploadURLExternal",
      {
        method: "POST",
        body: JSON.stringify({
          filename: args.filename,
          length: args.length,
          alt_text: args.alt_txt,
        }),
      },
      true  // useUserToken
    );
  }

  async completeUploadExternal(args: FilesCompleteUploadExternalArgs): Promise<any> {
    Logger.debug('Completing upload', { files: args.files, channel_id: args.channel_id });

    return this.makeApiRequest(
      "https://slack.com/api/files.completeUploadExternal",
      {
        method: "POST",
        body: JSON.stringify({
          files: args.files,
          channel_id: args.channel_id,
          initial_comment: args.initial_comment,
          thread_ts: args.thread_ts,
        }),
      },
      true  // useUserToken
    );
  }

  // Wrapper for v2 upload flow
  async uploadFile_v2(args: FilesUploadArgs): Promise<any> {
    Logger.debug('Starting v2 file upload', { filename: args.filename, file_path: args.file_path });

    let content: Buffer;
    let filename: string;
    let filetype: string | undefined;

    // Handle file path input
    if (args.file_path) {
      try {
        // Read file from filesystem
        content = await fs.readFile(args.file_path);
        
        // Use provided filename or extract from path
        filename = args.filename || path.basename(args.file_path);
        
        // Auto-detect MIME type if not provided
        if (!args.filetype) {
          const mimeType = lookup(args.file_path);
          filetype = mimeType || 'application/octet-stream';
        } else {
          filetype = args.filetype;
        }
        
        Logger.debug('Read file from filesystem', { 
          path: args.file_path, 
          size: content.length,
          detectedType: filetype 
        });
      } catch (error) {
        Logger.error('Failed to read file', { path: args.file_path, error });
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to read file at ${args.file_path}: ${errorMessage}`);
      }
    } else if (args.content && args.filename) {
      // Handle content input (existing behavior)
      content = Buffer.from(args.content, 'utf8');
      filename = args.filename;
      filetype = args.filetype || 'text/plain';
    } else {
      throw new Error('Either file_path or both content and filename are required for file upload');
    }

    // Step 1: Get upload URL
    const uploadUrlResponse = await this.getUploadURLExternal({
      filename: filename,
      length: content.length,
    });

    if (!uploadUrlResponse.ok) {
      Logger.error('Failed to get upload URL', uploadUrlResponse);
      return uploadUrlResponse;
    }

    const { upload_url, file_id } = uploadUrlResponse;

    // Step 2: Upload file to the URL
    try {
      const uploadResponse = await fetch(upload_url, {
        method: 'POST',
        body: content,
        headers: {
          'Content-Type': filetype || 'application/octet-stream',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      // Step 3: Complete the upload
      const completeResponse = await this.completeUploadExternal({
        files: [{
          id: file_id,
          title: args.title || filename,
        }],
        channel_id: args.channels?.[0],
        initial_comment: args.initial_comment,
        thread_ts: args.thread_ts,
      });

      return completeResponse;
    } catch (error) {
      Logger.error('Error during file upload', error);
      throw error;
    }
  }

  // Search API methods
  async searchMessages(args: SearchMessagesArgs): Promise<any> {
    Logger.debug('Searching messages', { query: args.query, sort: args.sort });

    const params = new URLSearchParams({
      query: args.query,
    });

    if (args.sort) params.append("sort", args.sort);
    if (args.sort_dir) params.append("sort_dir", args.sort_dir);
    if (args.highlight !== undefined) params.append("highlight", args.highlight.toString());
    if (args.count) params.append("count", args.count.toString());
    if (args.page) params.append("page", args.page.toString());

    return this.makeApiRequest(
      `https://slack.com/api/search.messages?${params}`,
      { method: 'GET' },
      true  // useUserToken - search APIs require user tokens
    );
  }

  async searchFiles(args: SearchFilesArgs): Promise<any> {
    Logger.debug('Searching files', { query: args.query, sort: args.sort });

    const params = new URLSearchParams({
      query: args.query,
    });

    if (args.sort) params.append("sort", args.sort);
    if (args.sort_dir) params.append("sort_dir", args.sort_dir);
    if (args.highlight !== undefined) params.append("highlight", args.highlight.toString());
    if (args.count) params.append("count", args.count.toString());
    if (args.page) params.append("page", args.page.toString());

    return this.makeApiRequest(
      `https://slack.com/api/search.files?${params}`,
      { method: 'GET' },
      true  // useUserToken - search APIs require user tokens
    );
  }

  // Reminder API methods
  async addReminder(args: RemindersAddArgs): Promise<any> {
    Logger.debug('Adding reminder', { text: args.text, time: args.time, user: args.user });

    return this.makeApiRequest(
      "https://slack.com/api/reminders.add",
      {
        method: "POST",
        body: JSON.stringify({
          text: args.text,
          time: args.time,
          user: args.user,
        }),
      },
      true  // useUserToken
    );
  }

  async listReminders(args: RemindersListArgs): Promise<any> {
    Logger.debug('Listing reminders', { user: args.user });

    const params = new URLSearchParams();
    if (args.user) params.append("user", args.user);

    return this.makeApiRequest(
      `https://slack.com/api/reminders.list?${params}`,
      { method: 'GET' },
      true  // useUserToken
    );
  }

  async deleteReminder(args: RemindersDeleteArgs): Promise<any> {
    Logger.debug('Deleting reminder', { reminder: args.reminder });

    return this.makeApiRequest(
      "https://slack.com/api/reminders.delete",
      {
        method: "POST",
        body: JSON.stringify({
          reminder: args.reminder,
        }),
      },
      true  // useUserToken
    );
  }

  // Channel/Conversation Management methods
  async createConversation(args: ConversationCreateArgs): Promise<any> {
    Logger.debug('Creating conversation', { name: args.name, is_private: args.is_private });

    return this.makeApiRequest(
      "https://slack.com/api/conversations.create",
      {
        method: "POST",
        body: JSON.stringify({
          name: args.name,
          is_private: args.is_private || false,
          team_id: args.team_id,
        }),
      }
    );
  }

  async archiveConversation(args: ConversationArchiveArgs): Promise<any> {
    Logger.debug('Archiving conversation', { channel: args.channel });

    return this.makeApiRequest(
      "https://slack.com/api/conversations.archive",
      {
        method: "POST",
        body: JSON.stringify({
          channel: args.channel,
        }),
      }
    );
  }

  async unarchiveConversation(args: ConversationUnarchiveArgs): Promise<any> {
    Logger.debug('Unarchiving conversation', { channel: args.channel });

    return this.makeApiRequest(
      "https://slack.com/api/conversations.unarchive",
      {
        method: "POST",
        body: JSON.stringify({
          channel: args.channel,
        }),
      }
    );
  }

  async inviteToConversation(args: ConversationInviteArgs): Promise<any> {
    Logger.debug('Inviting to conversation', { channel: args.channel, users: args.users });

    return this.makeApiRequest(
      "https://slack.com/api/conversations.invite",
      {
        method: "POST",
        body: JSON.stringify({
          channel: args.channel,
          users: args.users,
        }),
      }
    );
  }

  async kickFromConversation(args: ConversationKickArgs): Promise<any> {
    Logger.debug('Kicking from conversation', { channel: args.channel, user: args.user });

    return this.makeApiRequest(
      "https://slack.com/api/conversations.kick",
      {
        method: "POST",
        body: JSON.stringify({
          channel: args.channel,
          user: args.user,
        }),
      }
    );
  }

  async renameConversation(args: ConversationRenameArgs): Promise<any> {
    Logger.debug('Renaming conversation', { channel: args.channel, name: args.name });

    return this.makeApiRequest(
      "https://slack.com/api/conversations.rename",
      {
        method: "POST",
        body: JSON.stringify({
          channel: args.channel,
          name: args.name,
        }),
      }
    );
  }

  async setConversationPurpose(args: ConversationSetPurposeArgs): Promise<any> {
    Logger.debug('Setting conversation purpose', { channel: args.channel, purpose: args.purpose });

    return this.makeApiRequest(
      "https://slack.com/api/conversations.setPurpose",
      {
        method: "POST",
        body: JSON.stringify({
          channel: args.channel,
          purpose: args.purpose,
        }),
      }
    );
  }

  async setConversationTopic(args: ConversationSetTopicArgs): Promise<any> {
    Logger.debug('Setting conversation topic', { channel: args.channel, topic: args.topic });

    return this.makeApiRequest(
      "https://slack.com/api/conversations.setTopic",
      {
        method: "POST",
        body: JSON.stringify({
          channel: args.channel,
          topic: args.topic,
        }),
      }
    );
  }

  async joinConversation(args: ConversationJoinArgs): Promise<any> {
    Logger.debug('Joining conversation', { channel: args.channel });

    return this.makeApiRequest(
      "https://slack.com/api/conversations.join",
      {
        method: "POST",
        body: JSON.stringify({
          channel: args.channel,
        }),
      }
    );
  }

  async leaveConversation(args: ConversationLeaveArgs): Promise<any> {
    Logger.debug('Leaving conversation', { channel: args.channel });

    return this.makeApiRequest(
      "https://slack.com/api/conversations.leave",
      {
        method: "POST",
        body: JSON.stringify({
          channel: args.channel,
        }),
      }
    );
  }

  // Pins API methods
  async addPin(args: PinsAddArgs): Promise<any> {
    Logger.debug('Adding pin', { channel: args.channel, timestamp: args.timestamp });

    return this.makeApiRequest(
      "https://slack.com/api/pins.add",
      {
        method: "POST",
        body: JSON.stringify({
          channel: args.channel,
          timestamp: args.timestamp,
        }),
      }
    );
  }

  async removePin(args: PinsRemoveArgs): Promise<any> {
    Logger.debug('Removing pin', { channel: args.channel, timestamp: args.timestamp });

    return this.makeApiRequest(
      "https://slack.com/api/pins.remove",
      {
        method: "POST",
        body: JSON.stringify({
          channel: args.channel,
          timestamp: args.timestamp,
        }),
      }
    );
  }

  async listPins(args: PinsListArgs): Promise<any> {
    Logger.debug('Listing pins', { channel: args.channel });

    const params = new URLSearchParams({
      channel: args.channel,
    });

    return this.makeApiRequest(
      `https://slack.com/api/pins.list?${params}`,
      { method: 'GET' }
    );
  }

  // Additional Reactions API methods
  async removeReaction(args: ReactionsRemoveArgs): Promise<any> {
    Logger.debug('Removing reaction', { channel: args.channel, timestamp: args.timestamp, name: args.name });

    return this.makeApiRequest(
      "https://slack.com/api/reactions.remove",
      {
        method: "POST",
        body: JSON.stringify({
          channel: args.channel,
          timestamp: args.timestamp,
          name: args.name,
        }),
      }
    );
  }

  async getReactions(args: ReactionsGetArgs): Promise<any> {
    Logger.debug('Getting reactions', { channel: args.channel, timestamp: args.timestamp, full: args.full });

    const params = new URLSearchParams({
      channel: args.channel,
      timestamp: args.timestamp,
    });

    if (args.full) params.append("full", "true");

    return this.makeApiRequest(
      `https://slack.com/api/reactions.get?${params}`,
      { method: 'GET' }
    );
  }

  async listReactions(args: ReactionsListArgs): Promise<any> {
    Logger.debug('Listing reactions', { count: args.count, page: args.page, full: args.full });

    const params = new URLSearchParams();

    if (args.count) params.append("count", args.count.toString());
    if (args.page) params.append("page", args.page.toString());
    if (args.full) params.append("full", "true");

    return this.makeApiRequest(
      `https://slack.com/api/reactions.list?${params}`,
      { method: 'GET' }
    );
  }

  // Views API methods
  async openView(args: ViewsOpenArgs): Promise<any> {
    Logger.debug('Opening view', { trigger_id: args.trigger_id, view_type: args.view.type });

    return this.makeApiRequest(
      "https://slack.com/api/views.open",
      {
        method: "POST",
        body: JSON.stringify({
          trigger_id: args.trigger_id,
          view: args.view,
        }),
      }
    );
  }

  async updateView(args: ViewsUpdateArgs): Promise<any> {
    Logger.debug('Updating view', { view_id: args.view_id, view_type: args.view.type, has_hash: !!args.hash });

    return this.makeApiRequest(
      "https://slack.com/api/views.update",
      {
        method: "POST",
        body: JSON.stringify({
          view_id: args.view_id,
          view: args.view,
          hash: args.hash,
        }),
      }
    );
  }

  async pushView(args: ViewsPushArgs): Promise<any> {
    Logger.debug('Pushing view', { trigger_id: args.trigger_id, view_type: args.view.type });

    return this.makeApiRequest(
      "https://slack.com/api/views.push",
      {
        method: "POST",
        body: JSON.stringify({
          trigger_id: args.trigger_id,
          view: args.view,
        }),
      }
    );
  }
}

async function main() {
  try {
    Logger.info("Starting Slack MCP Server v0.9.0");
    Logger.info("Log level:", { level: LOG_LEVEL });

    // Set up global error handlers to keep server running
    let errorCount = 0;
    const MAX_ERROR_COUNT = 10;
    const ERROR_RESET_INTERVAL = 60000; // Reset error count every minute

    // Reset error count periodically
    const errorResetInterval = setInterval(() => {
      if (errorCount > 0) {
        Logger.info(`Resetting error count from ${errorCount} to 0`);
        errorCount = 0;
      }
    }, ERROR_RESET_INTERVAL);

    process.on('uncaughtException', (error) => {
      errorCount++;
      Logger.error('Uncaught Exception (server continues):', error);
      Logger.warn(`Server is continuing despite uncaught exception. Error count: ${errorCount}/${MAX_ERROR_COUNT}`);

      // If too many errors, exit to prevent infinite error loop
      if (errorCount >= MAX_ERROR_COUNT) {
        Logger.error(`Too many errors (${errorCount}), shutting down to prevent system instability`);
        process.exit(1);
      }
    });

    process.on('unhandledRejection', (reason, promise) => {
      errorCount++;
      Logger.error('Unhandled Rejection (server continues):', {
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        promise: String(promise)
      });
      Logger.warn(`Server is continuing despite unhandled rejection. Error count: ${errorCount}/${MAX_ERROR_COUNT}`);

      // If too many errors, exit to prevent infinite error loop
      if (errorCount >= MAX_ERROR_COUNT) {
        Logger.error(`Too many errors (${errorCount}), shutting down to prevent system instability`);
        process.exit(1);
      }
    });

    // Handle warnings
    process.on('warning', (warning) => {
      Logger.warn('Process Warning:', {
        name: warning.name,
        message: warning.message,
        stack: warning.stack
      });
    });

    // Graceful shutdown handlers
    const shutdown = (signal: string) => {
      Logger.info(`Received ${signal}, shutting down gracefully...`);
      clearInterval(errorResetInterval);
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    const botToken = process.env.SLACK_BOT_TOKEN;
    const teamId = process.env.SLACK_TEAM_ID;

    if (!botToken || !teamId) {
      Logger.error(
        "Missing required environment variables: SLACK_BOT_TOKEN and SLACK_TEAM_ID"
      );
      process.exit(1);
    }

    Logger.info("Environment configured", {
      teamId,
      hasBotToken: !!botToken,
      hasUserToken: !!process.env.SLACK_USER_TOKEN
    });

    const userToken = process.env.SLACK_USER_TOKEN;
    if (!userToken) {
      Logger.warn(
        "SLACK_USER_TOKEN not set. File uploads, reminders, and some Canvas operations will not work."
      );
    }

    Logger.info("Initializing MCP server...");
    const server = new Server(
      {
        name: "Slack MCP Server with Canvas",
        version: "0.9.0",
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
          resources: {},
        },
      },
    );

    const slackClient = new SlackClient(botToken);

    server.setRequestHandler(
      CallToolRequestSchema,
      async (request: CallToolRequest) => {
        Logger.info(`Tool called: ${request.params.name}`, {
          tool: request.params.name,
          hasArguments: !!request.params.arguments,
        });

        Logger.debug("Tool request details", request.params);

        try {
          if (!request.params.arguments) {
            throw new Error("No arguments provided");
          }

          switch (request.params.name) {
          case "slack_list_channels": {
            const args = request.params
                  .arguments as unknown as ListChannelsArgs;
            const response = await slackClient.getChannels(
              args.limit,
              args.cursor,
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_post_message": {
            const args = request.params.arguments as unknown as PostMessageArgs;
            if (!args.channel_id || !args.text) {
              throw new Error(
                "Missing required arguments: channel_id and text",
              );
            }
            const response = await slackClient.postMessage(
              args.channel_id,
              args.text,
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_reply_to_thread": {
            const args = request.params
                  .arguments as unknown as ReplyToThreadArgs;
            if (!args.channel_id || !args.thread_ts || !args.text) {
              throw new Error(
                "Missing required arguments: channel_id, thread_ts, and text",
              );
            }
            const response = await slackClient.postReply(
              args.channel_id,
              args.thread_ts,
              args.text,
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_add_reaction": {
            const args = request.params.arguments as unknown as AddReactionArgs;
            if (!args.channel_id || !args.timestamp || !args.reaction) {
              throw new Error(
                "Missing required arguments: channel_id, timestamp, and reaction",
              );
            }
            const response = await slackClient.addReaction(
              args.channel_id,
              args.timestamp,
              args.reaction,
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_get_channel_history": {
            const args = request.params
                  .arguments as unknown as GetChannelHistoryArgs;
            if (!args.channel_id) {
              throw new Error("Missing required argument: channel_id");
            }
            const response = await slackClient.getChannelHistory(
              args.channel_id,
              args.limit,
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_get_thread_replies": {
            const args = request.params
                  .arguments as unknown as GetThreadRepliesArgs;
            if (!args.channel_id || !args.thread_ts) {
              throw new Error(
                "Missing required arguments: channel_id and thread_ts",
              );
            }
            const response = await slackClient.getThreadReplies(
              args.channel_id,
              args.thread_ts,
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_get_users": {
            const args = request.params.arguments as unknown as GetUsersArgs;
            const response = await slackClient.getUsers(
              args.limit,
              args.cursor,
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_get_user_profile": {
            const args = request.params
                  .arguments as unknown as GetUserProfileArgs;
            if (!args.user_id) {
              throw new Error("Missing required argument: user_id");
            }
            const response = await slackClient.getUserProfile(args.user_id);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_user_email": {
            const args = request.params.arguments as unknown as UserLookupByEmailArgs;
            if (!args.email) {
              throw new Error("Missing required argument: email");
            }
            const response = await slackClient.getUserByEmail(args.email);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

            // Canvas API handlers
          case "slack_canvas_create": {
            const args = request.params.arguments as unknown as CanvasCreateArgs;
            const response = await slackClient.createCanvas(
              args.title,
              args.document_content,
              args.channel_id,
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_canvas_edit": {
            const args = request.params.arguments as unknown as CanvasEditArgs;
            if (!args.canvas_id || !args.changes) {
              throw new Error(
                "Missing required arguments: canvas_id and changes",
              );
            }
            const response = await slackClient.editCanvas(
              args.canvas_id,
              args.changes,
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_channel_canvas_create": {
            const args = request.params.arguments as unknown as ChannelCanvasCreateArgs;
            if (!args.channel_id) {
              throw new Error("Missing required argument: channel_id");
            }
            const response = await slackClient.createChannelCanvas(
              args.channel_id,
              args.document_content,
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_canvas_get": {
            const args = request.params.arguments as unknown as CanvasGetArgs;
            if (!args.canvas_id) {
              throw new Error("Missing required argument: canvas_id");
            }
            const response = await slackClient.getCanvas(args.canvas_id);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_canvas_delete": {
            const args = request.params.arguments as unknown as CanvasDeleteArgs;
            if (!args.canvas_id) {
              throw new Error("Missing required argument: canvas_id");
            }
            const response = await slackClient.deleteCanvas(args.canvas_id);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_canvas_access_set": {
            const args = request.params.arguments as unknown as CanvasAccessSetArgs;
            if (!args.canvas_id || !args.access_level) {
              throw new Error(
                "Missing required arguments: canvas_id and access_level",
              );
            }
            if (args.channel_ids && args.user_ids) {
              throw new Error(
                "Cannot specify both channel_ids and user_ids",
              );
            }
            const response = await slackClient.setCanvasAccess(
              args.canvas_id,
              args.access_level,
              args.channel_ids,
              args.user_ids,
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

            // Files API handlers
          case "slack_files_upload": {
            const args = request.params.arguments as unknown as FilesUploadArgs;
            if (!args.content || !args.filename) {
              throw new Error(
                "Missing required arguments: content and filename",
              );
            }
            const response = await slackClient.uploadFile(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_files_list": {
            const args = request.params.arguments as unknown as FilesListArgs;
            const response = await slackClient.listFiles(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_files_info": {
            const args = request.params.arguments as unknown as FilesInfoArgs;
            if (!args.file) {
              throw new Error("Missing required argument: file");
            }
            const response = await slackClient.getFileInfo(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_files_delete": {
            const args = request.params.arguments as unknown as FilesDeleteArgs;
            if (!args.file) {
              throw new Error("Missing required argument: file");
            }
            const response = await slackClient.deleteFile(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

            // New Files API v2 handlers
          case "slack_files_getUploadURLExternal": {
            const args = request.params.arguments as unknown as FilesGetUploadURLExternalArgs;
            if (!args.filename || args.length === undefined || args.length === null) {
              throw new Error(
                "Missing required arguments: filename and length",
              );
            }
            const response = await slackClient.getUploadURLExternal(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_files_completeUploadExternal": {
            const args = request.params.arguments as unknown as FilesCompleteUploadExternalArgs;
            if (!args.files || !Array.isArray(args.files) || args.files.length === 0) {
              throw new Error(
                "Missing required argument: files (must be a non-empty array)",
              );
            }
            const response = await slackClient.completeUploadExternal(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_files_upload_v2": {
            const args = request.params.arguments as unknown as FilesUploadArgs;
            if (!args.file_path && (!args.content || !args.filename)) {
              throw new Error(
                "Missing required arguments: either file_path OR both content and filename",
              );
            }
            const response = await slackClient.uploadFile_v2(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

            // Search API handlers
          case "slack_search_messages": {
            const args = request.params.arguments as unknown as SearchMessagesArgs;
            if (!args.query) {
              throw new Error("Missing required argument: query");
            }
            const response = await slackClient.searchMessages(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_search_files": {
            const args = request.params.arguments as unknown as SearchFilesArgs;
            if (!args.query) {
              throw new Error("Missing required argument: query");
            }
            const response = await slackClient.searchFiles(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

            // Reminder API handlers
          case "slack_reminders_add": {
            const args = request.params.arguments as unknown as RemindersAddArgs;
            if (!args.text || args.time === undefined || args.time === null) {
              throw new Error("Missing required arguments: text and time");
            }

            // Validate time format
            if (typeof args.time === 'string' && args.time.trim() === '') {
              throw new Error("Time cannot be an empty string");
            }

            // If it's a number, ensure it's a valid Unix timestamp (not in the past)
            if (typeof args.time === 'number' && args.time < Date.now() / 1000) {
              Logger.warn("Reminder time appears to be in the past", {
                provided: args.time,
                current: Math.floor(Date.now() / 1000)
              });
            }

            const response = await slackClient.addReminder(args);

            // Check for common errors
            if (!response.ok) {
              Logger.error("Failed to add reminder", {
                error: response.error,
                text: args.text,
                time: args.time,
                user: args.user
              });

              // Provide helpful error messages
              if (response.error === 'invalid_time') {
                response.hint = "Time format not recognized. Try 'tomorrow at 3pm' or a Unix timestamp";
              } else if (response.error === 'cannot_parse') {
                response.hint = "Could not parse the time. Use natural language like 'in 2 hours' or 'next Monday at 9am'";
              } else if (response.error === 'time_in_past') {
                response.hint = "The specified time is in the past";
              }
            }

            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_reminders_list": {
            const args = request.params.arguments as unknown as RemindersListArgs;
            const response = await slackClient.listReminders(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_reminders_delete": {
            const args = request.params.arguments as unknown as RemindersDeleteArgs;
            if (!args.reminder) {
              throw new Error("Missing required argument: reminder");
            }
            const response = await slackClient.deleteReminder(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

            // Channel/Conversation Management handlers
          case "slack_conversation_create": {
            const args = request.params.arguments as unknown as ConversationCreateArgs;
            if (!args.name) {
              throw new Error("Missing required argument: name");
            }
            const response = await slackClient.createConversation(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_conversation_archive": {
            const args = request.params.arguments as unknown as ConversationArchiveArgs;
            if (!args.channel) {
              throw new Error("Missing required argument: channel");
            }
            const response = await slackClient.archiveConversation(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_conversation_unarchive": {
            const args = request.params.arguments as unknown as ConversationUnarchiveArgs;
            if (!args.channel) {
              throw new Error("Missing required argument: channel");
            }
            const response = await slackClient.unarchiveConversation(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_conversation_invite": {
            const args = request.params.arguments as unknown as ConversationInviteArgs;
            if (!args.channel || !args.users) {
              throw new Error("Missing required arguments: channel and users");
            }
            const response = await slackClient.inviteToConversation(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_conversation_kick": {
            const args = request.params.arguments as unknown as ConversationKickArgs;
            if (!args.channel || !args.user) {
              throw new Error("Missing required arguments: channel and user");
            }
            const response = await slackClient.kickFromConversation(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_conversation_rename": {
            const args = request.params.arguments as unknown as ConversationRenameArgs;
            if (!args.channel || !args.name) {
              throw new Error("Missing required arguments: channel and name");
            }
            const response = await slackClient.renameConversation(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_conversation_set_purpose": {
            const args = request.params.arguments as unknown as ConversationSetPurposeArgs;
            if (!args.channel || !args.purpose) {
              throw new Error("Missing required arguments: channel and purpose");
            }
            const response = await slackClient.setConversationPurpose(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_conversation_set_topic": {
            const args = request.params.arguments as unknown as ConversationSetTopicArgs;
            if (!args.channel || !args.topic) {
              throw new Error("Missing required arguments: channel and topic");
            }
            const response = await slackClient.setConversationTopic(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_conversation_join": {
            const args = request.params.arguments as unknown as ConversationJoinArgs;
            if (!args.channel) {
              throw new Error("Missing required argument: channel");
            }
            const response = await slackClient.joinConversation(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_conversation_leave": {
            const args = request.params.arguments as unknown as ConversationLeaveArgs;
            if (!args.channel) {
              throw new Error("Missing required argument: channel");
            }
            const response = await slackClient.leaveConversation(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

            // Pins API handlers
          case "slack_pins_add": {
            const args = request.params.arguments as unknown as PinsAddArgs;
            if (!args.channel || !args.timestamp) {
              throw new Error("Missing required arguments: channel and timestamp");
            }
            const response = await slackClient.addPin(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_pins_remove": {
            const args = request.params.arguments as unknown as PinsRemoveArgs;
            if (!args.channel || !args.timestamp) {
              throw new Error("Missing required arguments: channel and timestamp");
            }
            const response = await slackClient.removePin(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_pins_list": {
            const args = request.params.arguments as unknown as PinsListArgs;
            if (!args.channel) {
              throw new Error("Missing required argument: channel");
            }
            const response = await slackClient.listPins(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

            // Additional Reactions API handlers
          case "slack_reactions_remove": {
            const args = request.params.arguments as unknown as ReactionsRemoveArgs;
            if (!args.channel || !args.timestamp || !args.name) {
              throw new Error("Missing required arguments: channel, timestamp, and name");
            }
            const response = await slackClient.removeReaction(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_reactions_get": {
            const args = request.params.arguments as unknown as ReactionsGetArgs;
            if (!args.channel || !args.timestamp) {
              throw new Error("Missing required arguments: channel and timestamp");
            }
            const response = await slackClient.getReactions(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_reactions_list": {
            const args = request.params.arguments as unknown as ReactionsListArgs;
            const response = await slackClient.listReactions(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

            // Views API handlers
          case "slack_views_open": {
            const args = request.params.arguments as unknown as ViewsOpenArgs;
            if (!args.trigger_id || !args.view) {
              throw new Error("Missing required arguments: trigger_id and view");
            }
            const response = await slackClient.openView(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_views_update": {
            const args = request.params.arguments as unknown as ViewsUpdateArgs;
            if (!args.view_id || !args.view) {
              throw new Error("Missing required arguments: view_id and view");
            }
            const response = await slackClient.updateView(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_views_push": {
            const args = request.params.arguments as unknown as ViewsPushArgs;
            if (!args.trigger_id || !args.view) {
              throw new Error("Missing required arguments: trigger_id and view");
            }
            const response = await slackClient.pushView(args);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
          }

          Logger.success(`Tool ${request.params.name} completed successfully`);
        } catch (error) {
          Logger.error(`Error executing tool ${request.params.name}:`, {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            tool: request.params.name,
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: error instanceof Error ? error.message : String(error),
                  tool: request.params.name,
                  hint: "Enable debug mode with SLACK_MCP_LOG_LEVEL=debug for more details",
                }),
              },
            ],
          };
        }
      },
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => {
      Logger.debug("Listing available tools");
      return {
        tools: [
          // Existing tools
          listChannelsTool,
          postMessageTool,
          replyToThreadTool,
          addReactionTool,
          getChannelHistoryTool,
          getThreadRepliesTool,
          getUsersTool,
          getUserProfileTool,
          userLookupByEmailTool,
          // Canvas tools
          canvasCreateTool,
          canvasEditTool,
          channelCanvasCreateTool,
          canvasGetTool,
          canvasDeleteTool,
          canvasAccessSetTool,
          // Files API tools
          filesUploadTool,
          filesListTool,
          filesInfoTool,
          filesDeleteTool,
          // New Files API v2 tools
          filesGetUploadURLExternalTool,
          filesCompleteUploadExternalTool,
          filesUploadV2Tool,
          // Search API tools
          searchMessagesTool,
          searchFilesTool,
          // Reminder API tools
          remindersAddTool,
          remindersListTool,
          remindersDeleteTool,
          // Channel/Conversation Management tools
          conversationCreateTool,
          conversationArchiveTool,
          conversationUnarchiveTool,
          conversationInviteTool,
          conversationKickTool,
          conversationRenameTool,
          conversationSetPurposeTool,
          conversationSetTopicTool,
          conversationJoinTool,
          conversationLeaveTool,
          // Pins API tools
          pinsAddTool,
          pinsRemoveTool,
          pinsListTool,
          // Additional Reactions API tools
          reactionsRemoveTool,
          reactionsGetTool,
          reactionsListTool,
          // Views API tools
          viewsOpenTool,
          viewsUpdateTool,
          viewsPushTool,
        ],
      };
    });

    // Handle prompts list (we don't provide any prompts)
    server.setRequestHandler(ListPromptsRequestSchema, async () => {
      Logger.debug("Listing prompts (none available)");
      return {
        prompts: [],
      };
    });

    // Handle resources list (we don't provide any resources)
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      Logger.debug("Listing resources (none available)");
      return {
        resources: [],
      };
    });

    const transport = new StdioServerTransport();
    Logger.info("Connecting to stdio transport...");
    await server.connect(transport);

    Logger.success("Slack MCP Server running successfully!");
    Logger.info("Ready to handle requests", {
      tools: 45,
      logLevel: LOG_LEVEL,
    });
  } catch (error) {
    Logger.error("Error in main function:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

main().catch((error) => {
  Logger.error("Fatal error in main():", {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});
