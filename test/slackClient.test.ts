import { mockFetch, mockSlackResponse, mockSlackError } from './setup';

// Extract SlackClient class for testing
class SlackClient {
  private botHeaders: { Authorization: string; "Content-Type": string };

  constructor(botToken: string) {
    this.botHeaders = {
      Authorization: `Bearer ${botToken}`,
      "Content-Type": "application/json",
    };
  }

  async getChannels(limit: number = 100, cursor?: string): Promise<any> {
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

  async createCanvas(title?: string, document_content?: any, channel_id?: string): Promise<any> {
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
}

describe('SlackClient', () => {
  let slackClient: SlackClient;

  beforeEach(() => {
    slackClient = new SlackClient('xoxb-test-token');
  });

  describe('getChannels', () => {
    it('should fetch channels successfully', async () => {
      const mockChannels = {
        ok: true,
        channels: [
          { id: 'C123', name: 'general' },
          { id: 'C456', name: 'random' }
        ]
      };

      mockSlackResponse(mockChannels);

      const result = await slackClient.getChannels();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://slack.com/api/conversations.list'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer xoxb-test-token'
          })
        })
      );

      expect(result).toEqual(mockChannels);
    });

    it('should include both public and private channels', async () => {
      const mockChannels = { ok: true, channels: [] };
      mockSlackResponse(mockChannels);

      await slackClient.getChannels();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('public_channel'),
        expect.any(Object)
      );
    });

    it('should handle cursor pagination', async () => {
      const mockChannels = { ok: true, channels: [] };
      mockSlackResponse(mockChannels);

      await slackClient.getChannels(50, 'cursor123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('cursor=cursor123'),
        expect.any(Object)
      );
    });
  });

  describe('postMessage', () => {
    it('should post message successfully', async () => {
      const mockResponse = {
        ok: true,
        ts: '1234567890.123456'
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.postMessage('C123', 'Hello World');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://slack.com/api/chat.postMessage',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer xoxb-test-token',
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            channel: 'C123',
            text: 'Hello World'
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('createCanvas', () => {
    it('should create canvas with title and content', async () => {
      const mockResponse = {
        ok: true,
        canvas_id: 'F123456789'
      };

      mockSlackResponse(mockResponse);

      const document_content = {
        type: 'markdown',
        markdown: '# Test Canvas'
      };

      const result = await slackClient.createCanvas(
        'Test Canvas',
        document_content,
        'C123'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://slack.com/api/canvases.create',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            title: 'Test Canvas',
            document_content: document_content,
            channel_id: 'C123'
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should create canvas with minimal parameters', async () => {
      const mockResponse = {
        ok: true,
        canvas_id: 'F123456789'
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.createCanvas();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://slack.com/api/canvases.create',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({})
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });
});
