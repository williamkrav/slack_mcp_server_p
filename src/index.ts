#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

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

// Existing tool definitions
const listChannelsTool: Tool = {
  name: "slack_list_channels",
  description: "List public and private channels in the workspace with pagination",
  inputSchema: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        description:
          "Maximum number of channels to return (default 100, max 200)",
        default: 100,
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
        description: "Array of changes to apply to the canvas",
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
              description: "Content to insert or replace with",
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
          type: "string",
        },
        description: "List of channel IDs to grant access to (cannot be used with user_ids)",
      },
      user_ids: {
        type: "array",
        items: {
          type: "string",
        },
        description: "List of user IDs to grant access to (cannot be used with channel_ids)",
      },
    },
    required: ["canvas_id", "access_level"],
  },
};

class SlackClient {
  private botHeaders: { Authorization: string; "Content-Type": string };

  constructor(botToken: string) {
    this.botHeaders = {
      Authorization: `Bearer ${botToken}`,
      "Content-Type": "application/json",
    };
  }

  async getChannels(limit: number = 100, cursor?: string): Promise<any> {
    // Always fetch channels dynamically via API
    const params = new URLSearchParams({
      types: "public_channel,private_channel",
      exclude_archived: "true",
      limit: Math.min(limit, 200).toString(),
      team_id: process.env.SLACK_TEAM_ID!,
    });

    if (cursor) {
      params.append("cursor", cursor);
    }

    const response = await fetch(
      `https://slack.com/api/conversations.list?${params}`,
      { headers: this.botHeaders },
    );

    return response.json();
  }

  async postMessage(channel_id: string, text: string): Promise<any> {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: this.botHeaders,
      body: JSON.stringify({
        channel: channel_id,
        text: text,
      }),
    });

    return response.json();
  }

  async postReply(
    channel_id: string,
    thread_ts: string,
    text: string,
  ): Promise<any> {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: this.botHeaders,
      body: JSON.stringify({
        channel: channel_id,
        thread_ts: thread_ts,
        text: text,
      }),
    });

    return response.json();
  }

  async addReaction(
    channel_id: string,
    timestamp: string,
    reaction: string,
  ): Promise<any> {
    const response = await fetch("https://slack.com/api/reactions.add", {
      method: "POST",
      headers: this.botHeaders,
      body: JSON.stringify({
        channel: channel_id,
        timestamp: timestamp,
        name: reaction,
      }),
    });

    return response.json();
  }

  async getChannelHistory(
    channel_id: string,
    limit: number = 10,
  ): Promise<any> {
    const params = new URLSearchParams({
      channel: channel_id,
      limit: limit.toString(),
    });

    const response = await fetch(
      `https://slack.com/api/conversations.history?${params}`,
      { headers: this.botHeaders },
    );

    return response.json();
  }

  async getThreadReplies(channel_id: string, thread_ts: string): Promise<any> {
    const params = new URLSearchParams({
      channel: channel_id,
      ts: thread_ts,
    });

    const response = await fetch(
      `https://slack.com/api/conversations.replies?${params}`,
      { headers: this.botHeaders },
    );

    return response.json();
  }

  async getUsers(limit: number = 100, cursor?: string): Promise<any> {
    const params = new URLSearchParams({
      limit: Math.min(limit, 200).toString(),
      team_id: process.env.SLACK_TEAM_ID!,
    });

    if (cursor) {
      params.append("cursor", cursor);
    }

    const response = await fetch(`https://slack.com/api/users.list?${params}`, {
      headers: this.botHeaders,
    });

    return response.json();
  }

  async getUserProfile(user_id: string): Promise<any> {
    const params = new URLSearchParams({
      user: user_id,
      include_labels: "true",
    });

    const response = await fetch(
      `https://slack.com/api/users.profile.get?${params}`,
      { headers: this.botHeaders },
    );

    return response.json();
  }

  // Canvas API methods
  async createCanvas(title?: string, document_content?: DocumentContent, channel_id?: string): Promise<any> {
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

    const response = await fetch("https://slack.com/api/canvases.create", {
      method: "POST",
      headers: this.botHeaders,
      body: JSON.stringify(payload),
    });

    return response.json();
  }

  async editCanvas(canvas_id: string, changes: CanvasChange[]): Promise<any> {
    const response = await fetch("https://slack.com/api/canvases.edit", {
      method: "POST",
      headers: this.botHeaders,
      body: JSON.stringify({
        canvas_id: canvas_id,
        changes: changes,
      }),
    });

    return response.json();
  }

  async createChannelCanvas(channel_id: string, document_content?: DocumentContent): Promise<any> {
    const payload: any = {
      channel_id: channel_id,
    };
    
    if (document_content) {
      payload.document_content = document_content;
    }

    const response = await fetch("https://slack.com/api/conversations.canvases.create", {
      method: "POST",
      headers: this.botHeaders,
      body: JSON.stringify(payload),
    });

    return response.json();
  }

  async getCanvas(canvas_id: string): Promise<any> {
    const params = new URLSearchParams({
      canvas_id: canvas_id,
    });

    const response = await fetch(
      `https://slack.com/api/canvases.sections.lookup?${params}`,
      { headers: this.botHeaders },
    );

    return response.json();
  }

  async deleteCanvas(canvas_id: string): Promise<any> {
    const response = await fetch("https://slack.com/api/canvases.delete", {
      method: "POST",
      headers: this.botHeaders,
      body: JSON.stringify({
        canvas_id: canvas_id,
      }),
    });

    return response.json();
  }

  async setCanvasAccess(canvas_id: string, access_level: string, channel_ids?: string[], user_ids?: string[]): Promise<any> {
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

    const response = await fetch("https://slack.com/api/canvases.access.set", {
      method: "POST",
      headers: this.botHeaders,
      body: JSON.stringify(payload),
    });

    return response.json();
  }
}

async function main() {
  const botToken = process.env.SLACK_BOT_TOKEN;
  const teamId = process.env.SLACK_TEAM_ID;

  if (!botToken || !teamId) {
    console.error(
      "Please set SLACK_BOT_TOKEN and SLACK_TEAM_ID environment variables",
    );
    process.exit(1);
  }

  console.error("Starting Slack MCP Server with Canvas support...");
  const server = new Server(
    {
      name: "Slack MCP Server with Canvas",
      version: "0.7.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  const slackClient = new SlackClient(botToken);

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      console.error("Received CallToolRequest:", request);
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

          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        console.error("Error executing tool:", error);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
        };
      }
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error("Received ListToolsRequest");
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
        // Canvas tools
        canvasCreateTool,
        canvasEditTool,
        channelCanvasCreateTool,
        canvasGetTool,
        canvasDeleteTool,
        canvasAccessSetTool,
      ],
    };
  });

  const transport = new StdioServerTransport();
  console.error("Connecting server to transport...");
  await server.connect(transport);

  console.error("Slack MCP Server with Canvas support running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
