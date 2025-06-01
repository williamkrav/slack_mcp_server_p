import { mockFetch, mockSlackResponse, mockSlackError } from './setup';

// Search API type definitions
interface SearchMessagesArgs {
  query: string;
  sort?: "score" | "timestamp";
  sort_dir?: "asc" | "desc";
  highlight?: boolean;
  count?: number;
  page?: number;
}

interface SearchFilesArgs {
  query: string;
  sort?: "score" | "timestamp";
  sort_dir?: "asc" | "desc";
  highlight?: boolean;
  count?: number;
  page?: number;
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

  async searchMessages(args: SearchMessagesArgs): Promise<any> {
    const params = new URLSearchParams({
      query: args.query,
    });
    
    if (args.sort) params.append("sort", args.sort);
    if (args.sort_dir) params.append("sort_dir", args.sort_dir);
    if (args.highlight !== undefined) params.append("highlight", args.highlight.toString());
    if (args.count) params.append("count", args.count.toString());
    if (args.page) params.append("page", args.page.toString());

    const response = await fetch(
      `https://slack.com/api/search.messages?${params}`,
      { headers: this.botHeaders }
    );

    return response.json();
  }

  async searchFiles(args: SearchFilesArgs): Promise<any> {
    const params = new URLSearchParams({
      query: args.query,
    });
    
    if (args.sort) params.append("sort", args.sort);
    if (args.sort_dir) params.append("sort_dir", args.sort_dir);
    if (args.highlight !== undefined) params.append("highlight", args.highlight.toString());
    if (args.count) params.append("count", args.count.toString());
    if (args.page) params.append("page", args.page.toString());

    const response = await fetch(
      `https://slack.com/api/search.files?${params}`,
      { headers: this.botHeaders }
    );

    return response.json();
  }
}

describe('Search API', () => {
  let slackClient: SlackClient;

  beforeEach(() => {
    slackClient = new SlackClient('xoxb-test-token');
  });

  describe('searchMessages', () => {
    it('should search messages successfully', async () => {
      const mockResponse = {
        ok: true,
        query: 'test query',
        messages: {
          total: 2,
          pagination: {
            total_count: 2,
            page: 1,
            per_page: 20,
            page_count: 1,
            first: 1,
            last: 1,
          },
          matches: [
            {
              type: 'message',
              user: 'U123456',
              text: 'This is a test message',
              ts: '1234567890.123456',
              channel: {
                id: 'C123456',
                name: 'general',
              },
              permalink: 'https://slack.com/...',
            },
            {
              type: 'message',
              user: 'U789012',
              text: 'Another test message',
              ts: '1234567891.123456',
              channel: {
                id: 'C123456',
                name: 'general',
              },
              permalink: 'https://slack.com/...',
            },
          ],
        },
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.searchMessages({
        query: 'test query',
        sort: 'timestamp',
        sort_dir: 'desc',
        highlight: true,
        count: 20,
        page: 1,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://slack.com/api/search.messages'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer xoxb-test-token',
          }),
        })
      );

      expect(result.ok).toBe(true);
      expect(result.query).toBe('test query');
      expect(result.messages.matches).toHaveLength(2);
    });

    it('should handle search with operators', async () => {
      const mockResponse = {
        ok: true,
        query: 'from:U123456 in:general',
        messages: {
          total: 1,
          matches: [
            {
              type: 'message',
              user: 'U123456',
              text: 'Message from specific user',
              ts: '1234567890.123456',
              channel: {
                id: 'C123456',
                name: 'general',
              },
            },
          ],
        },
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.searchMessages({
        query: 'from:U123456 in:general',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('query=from%3AU123456'),
        expect.any(Object)
      );

      expect(result.ok).toBe(true);
      expect(result.messages.matches).toHaveLength(1);
    });
  });

  describe('searchFiles', () => {
    it('should search files successfully', async () => {
      const mockResponse = {
        ok: true,
        query: 'pdf',
        files: {
          total: 2,
          pagination: {
            total_count: 2,
            page: 1,
            per_page: 20,
            page_count: 1,
          },
          matches: [
            {
              id: 'F123456',
              name: 'document.pdf',
              title: 'Important Document',
              mimetype: 'application/pdf',
              size: 123456,
              created: 1234567890,
              user: 'U123456',
            },
            {
              id: 'F789012',
              name: 'report.pdf',
              title: 'Monthly Report',
              mimetype: 'application/pdf',
              size: 234567,
              created: 1234567891,
              user: 'U789012',
            },
          ],
        },
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.searchFiles({
        query: 'pdf',
        sort: 'timestamp',
        sort_dir: 'desc',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://slack.com/api/search.files'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer xoxb-test-token',
          }),
        })
      );

      expect(result.ok).toBe(true);
      expect(result.query).toBe('pdf');
      expect(result.files.matches).toHaveLength(2);
    });

    it('should handle empty search results', async () => {
      const mockResponse = {
        ok: true,
        query: 'nonexistent',
        files: {
          total: 0,
          matches: [],
        },
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.searchFiles({
        query: 'nonexistent',
      });

      expect(result.ok).toBe(true);
      expect(result.files.total).toBe(0);
      expect(result.files.matches).toHaveLength(0);
    });
  });
});