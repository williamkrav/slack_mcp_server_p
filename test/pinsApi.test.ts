import { mockFetch, mockSlackResponse, mockSlackError } from './setup';

// Pins API type definitions
interface PinsAddArgs {
  channel: string;
  timestamp: string;
}

interface PinsRemoveArgs {
  channel: string;
  timestamp: string;
}

interface PinsListArgs {
  channel: string;
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

  async addPin(args: PinsAddArgs): Promise<any> {
    const response = await fetch("https://slack.com/api/pins.add", {
      method: "POST",
      headers: this.botHeaders,
      body: JSON.stringify({
        channel: args.channel,
        timestamp: args.timestamp,
      }),
    });

    return response.json();
  }

  async removePin(args: PinsRemoveArgs): Promise<any> {
    const response = await fetch("https://slack.com/api/pins.remove", {
      method: "POST",
      headers: this.botHeaders,
      body: JSON.stringify({
        channel: args.channel,
        timestamp: args.timestamp,
      }),
    });

    return response.json();
  }

  async listPins(args: PinsListArgs): Promise<any> {
    const params = new URLSearchParams({
      channel: args.channel,
    });

    const response = await fetch(
      `https://slack.com/api/pins.list?${params}`,
      { headers: this.botHeaders }
    );

    return response.json();
  }
}

describe('Pins API', () => {
  let slackClient: SlackClient;

  beforeEach(() => {
    slackClient = new SlackClient('xoxb-test-token');
  });

  describe('addPin', () => {
    it('should pin a message successfully', async () => {
      const mockResponse = {
        ok: true,
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.addPin({
        channel: 'C123456',
        timestamp: '1234567890.123456',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://slack.com/api/pins.add',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer xoxb-test-token',
          }),
          body: JSON.stringify({
            channel: 'C123456',
            timestamp: '1234567890.123456',
          }),
        })
      );

      expect(result.ok).toBe(true);
    });

    it('should handle already pinned messages', async () => {
      const mockResponse = {
        ok: false,
        error: 'already_pinned',
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.addPin({
        channel: 'C123456',
        timestamp: '1234567890.123456',
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('already_pinned');
    });

    it('should handle message not found errors', async () => {
      const mockResponse = {
        ok: false,
        error: 'message_not_found',
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.addPin({
        channel: 'C123456',
        timestamp: '9999999999.999999',
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('message_not_found');
    });
  });

  describe('removePin', () => {
    it('should unpin a message successfully', async () => {
      const mockResponse = {
        ok: true,
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.removePin({
        channel: 'C123456',
        timestamp: '1234567890.123456',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://slack.com/api/pins.remove',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            channel: 'C123456',
            timestamp: '1234567890.123456',
          }),
        })
      );

      expect(result.ok).toBe(true);
    });

    it('should handle not pinned messages', async () => {
      const mockResponse = {
        ok: false,
        error: 'no_pin',
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.removePin({
        channel: 'C123456',
        timestamp: '1234567890.123456',
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('no_pin');
    });
  });

  describe('listPins', () => {
    it('should list pinned items successfully', async () => {
      const mockResponse = {
        ok: true,
        items: [
          {
            type: 'message',
            channel: 'C123456',
            created: 1234567890,
            created_by: 'U123456',
            message: {
              type: 'message',
              user: 'U123456',
              text: 'Important announcement!',
              ts: '1234567890.123456',
            },
          },
          {
            type: 'file',
            channel: 'C123456',
            created: 1234567891,
            created_by: 'U789012',
            file: {
              id: 'F123456',
              name: 'project-plan.pdf',
              title: 'Q1 Project Plan',
            },
          },
        ],
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.listPins({
        channel: 'C123456',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://slack.com/api/pins.list?channel=C123456'),
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

    it('should handle empty pins list', async () => {
      const mockResponse = {
        ok: true,
        items: [],
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.listPins({
        channel: 'C123456',
      });

      expect(result.ok).toBe(true);
      expect(result.items).toHaveLength(0);
    });

    it('should handle channel not found', async () => {
      const mockResponse = {
        ok: false,
        error: 'channel_not_found',
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.listPins({
        channel: 'C999999',
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('channel_not_found');
    });
  });
});