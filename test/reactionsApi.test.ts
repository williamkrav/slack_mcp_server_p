import { mockFetch, mockSlackResponse, mockSlackError } from './setup';

// Reactions API type definitions
interface ReactionsRemoveArgs {
  channel: string;
  timestamp: string;
  name: string;
}

interface ReactionsGetArgs {
  channel: string;
  timestamp: string;
  full?: boolean;
}

interface ReactionsListArgs {
  count?: number;
  page?: number;
  full?: boolean;
}

// Extract SlackClient class for testing
class SlackClient {
  private botHeaders: { Authorization: string; "Content-Type": string };

  constructor(botToken: string) {
    this.botHeaders = {
      Authorization: `Bearer ${botToken}`,
      "Content-Type": "application/json",
    };
  }

  async removeReaction(args: ReactionsRemoveArgs): Promise<any> {
    const response = await fetch("https://slack.com/api/reactions.remove", {
      method: "POST",
      headers: this.botHeaders,
      body: JSON.stringify({
        channel: args.channel,
        timestamp: args.timestamp,
        name: args.name,
      }),
    });

    return response.json();
  }

  async getReactions(args: ReactionsGetArgs): Promise<any> {
    const params = new URLSearchParams({
      channel: args.channel,
      timestamp: args.timestamp,
    });
    
    if (args.full) params.append("full", "true");

    const response = await fetch(
      `https://slack.com/api/reactions.get?${params}`,
      { headers: this.botHeaders }
    );

    return response.json();
  }

  async listReactions(args: ReactionsListArgs): Promise<any> {
    const params = new URLSearchParams();
    
    if (args.count) params.append("count", args.count.toString());
    if (args.page) params.append("page", args.page.toString());
    if (args.full) params.append("full", "true");

    const response = await fetch(
      `https://slack.com/api/reactions.list?${params}`,
      { headers: this.botHeaders }
    );

    return response.json();
  }
}

describe('Reactions API', () => {
  let slackClient: SlackClient;

  beforeEach(() => {
    slackClient = new SlackClient('xoxb-test-token');
  });

  describe('removeReaction', () => {
    it('should remove a reaction successfully', async () => {
      const mockResponse = {
        ok: true,
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.removeReaction({
        channel: 'C123456',
        timestamp: '1234567890.123456',
        name: 'thumbsup',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://slack.com/api/reactions.remove',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer xoxb-test-token',
          }),
          body: JSON.stringify({
            channel: 'C123456',
            timestamp: '1234567890.123456',
            name: 'thumbsup',
          }),
        })
      );

      expect(result.ok).toBe(true);
    });

    it('should handle reaction not found', async () => {
      const mockResponse = {
        ok: false,
        error: 'no_reaction',
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.removeReaction({
        channel: 'C123456',
        timestamp: '1234567890.123456',
        name: 'nonexistent',
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('no_reaction');
    });
  });

  describe('getReactions', () => {
    it('should get reactions for a message', async () => {
      const mockResponse = {
        ok: true,
        type: 'message',
        message: {
          type: 'message',
          user: 'U123456',
          text: 'Hello world!',
          ts: '1234567890.123456',
          reactions: [
            {
              name: 'thumbsup',
              users: ['U123456', 'U789012'],
              count: 2,
            },
            {
              name: 'heart',
              users: ['U345678'],
              count: 1,
            },
          ],
        },
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.getReactions({
        channel: 'C123456',
        timestamp: '1234567890.123456',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://slack.com/api/reactions.get?channel=C123456&timestamp=1234567890.123456'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer xoxb-test-token',
          }),
        })
      );

      expect(result.ok).toBe(true);
      expect(result.message.reactions).toHaveLength(2);
      expect(result.message.reactions[0].name).toBe('thumbsup');
      expect(result.message.reactions[0].count).toBe(2);
    });

    it('should get all reactions when full is true', async () => {
      const mockResponse = {
        ok: true,
        type: 'message',
        message: {
          type: 'message',
          user: 'U123456',
          text: 'Popular message!',
          ts: '1234567890.123456',
          reactions: Array(30).fill(null).map((_, i) => ({
            name: `emoji${i}`,
            users: ['U123456'],
            count: 1,
          })),
        },
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.getReactions({
        channel: 'C123456',
        timestamp: '1234567890.123456',
        full: true,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('full=true'),
        expect.any(Object)
      );

      expect(result.message.reactions).toHaveLength(30);
    });
  });

  describe('listReactions', () => {
    it('should list items reacted to by the user', async () => {
      const mockResponse = {
        ok: true,
        items: [
          {
            type: 'message',
            channel: 'C123456',
            message: {
              type: 'message',
              user: 'U789012',
              text: 'Great job!',
              ts: '1234567890.123456',
              reactions: [
                {
                  name: 'thumbsup',
                  users: ['U123456'],
                  count: 1,
                },
              ],
            },
          },
          {
            type: 'file',
            file: {
              id: 'F123456',
              name: 'document.pdf',
              reactions: [
                {
                  name: 'eyes',
                  users: ['U123456'],
                  count: 1,
                },
              ],
            },
          },
        ],
        paging: {
          count: 100,
          total: 2,
          page: 1,
          pages: 1,
        },
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.listReactions({
        count: 100,
        page: 1,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://slack.com/api/reactions.list'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer xoxb-test-token',
          }),
        })
      );

      expect(result.ok).toBe(true);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].type).toBe('message');
      expect(result.items[1].type).toBe('file');
    });

    it('should handle empty reactions list', async () => {
      const mockResponse = {
        ok: true,
        items: [],
        paging: {
          count: 100,
          total: 0,
          page: 1,
          pages: 0,
        },
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.listReactions({});

      expect(result.ok).toBe(true);
      expect(result.items).toHaveLength(0);
    });
  });
});