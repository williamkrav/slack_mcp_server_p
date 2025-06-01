import { mockFetch, mockSlackResponse, mockSlackError } from './setup';

// Files API type definitions
interface FilesUploadArgs {
  content?: string;
  filename?: string;
  filetype?: string;
  title?: string;
  initial_comment?: string;
  channels?: string[];
  thread_ts?: string;
}

interface FilesListArgs {
  channel?: string;
  user?: string;
  types?: string;
  from?: number;
  to?: number;
  count?: number;
  page?: number;
}

interface FilesInfoArgs {
  file: string;
  page?: number;
  count?: number;
}

interface FilesDeleteArgs {
  file: string;
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

  async uploadFile(args: FilesUploadArgs): Promise<any> {
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

    const response = await fetch("https://slack.com/api/files.upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SLACK_USER_TOKEN}`,
      },
      body: formData,
    });

    return response.json();
  }

  async listFiles(args: FilesListArgs): Promise<any> {
    const params = new URLSearchParams();
    
    if (args.channel) params.append("channel", args.channel);
    if (args.user) params.append("user", args.user);
    if (args.types) params.append("types", args.types);
    if (args.from) params.append("ts_from", args.from.toString());
    if (args.to) params.append("ts_to", args.to.toString());
    if (args.count) params.append("count", args.count.toString());
    if (args.page) params.append("page", args.page.toString());

    const response = await fetch(
      `https://slack.com/api/files.list?${params}`,
      { headers: this.botHeaders }
    );

    return response.json();
  }

  async getFileInfo(args: FilesInfoArgs): Promise<any> {
    const params = new URLSearchParams({
      file: args.file,
    });
    
    if (args.page) params.append("page", args.page.toString());
    if (args.count) params.append("count", args.count.toString());

    const response = await fetch(
      `https://slack.com/api/files.info?${params}`,
      { headers: this.botHeaders }
    );

    return response.json();
  }

  async deleteFile(args: FilesDeleteArgs): Promise<any> {
    const response = await fetch("https://slack.com/api/files.delete", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SLACK_USER_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file: args.file,
      }),
    });

    return response.json();
  }
}

describe('Files API', () => {
  let slackClient: SlackClient;

  beforeEach(() => {
    process.env.SLACK_USER_TOKEN = 'xoxp-test-token';
    slackClient = new SlackClient('xoxb-test-token');
  });

  afterEach(() => {
    delete process.env.SLACK_USER_TOKEN;
  });

  describe('uploadFile', () => {
    it('should upload a file successfully', async () => {
      const mockResponse = {
        ok: true,
        file: {
          id: 'F123456',
          name: 'test.txt',
          title: 'Test File',
          mimetype: 'text/plain',
          size: 1234,
        },
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.uploadFile({
        content: 'Hello, world!',
        filename: 'test.txt',
        title: 'Test File',
        initial_comment: 'This is a test file',
        channels: ['C123456'],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://slack.com/api/files.upload',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer xoxp-test-token',
          }),
          body: expect.any(FormData),
        })
      );

      expect(result.ok).toBe(true);
      expect(result.file.id).toBe('F123456');
    });

    it('should handle upload errors', async () => {
      const mockResponse = {
        ok: false,
        error: 'file_upload_error',
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.uploadFile({
        content: 'Hello, world!',
        filename: 'test.txt',
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('file_upload_error');
    });
  });

  describe('listFiles', () => {
    it('should list files successfully', async () => {
      const mockResponse = {
        ok: true,
        files: [
          {
            id: 'F123456',
            name: 'test.txt',
            title: 'Test File',
            created: 1234567890,
          },
          {
            id: 'F789012',
            name: 'image.png',
            title: 'Screenshot',
            created: 1234567891,
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

      const result = await slackClient.listFiles({
        channel: 'C123456',
        types: 'images,pdfs',
        count: 50,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://slack.com/api/files.list'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer xoxb-test-token',
          }),
        })
      );

      expect(result.ok).toBe(true);
      expect(result.files).toHaveLength(2);
    });
  });

  describe('getFileInfo', () => {
    it('should get file info successfully', async () => {
      const mockResponse = {
        ok: true,
        file: {
          id: 'F123456',
          name: 'test.txt',
          title: 'Test File',
          created: 1234567890,
          comments_count: 2,
          shares: {
            public: {
              C123456: [
                {
                  ts: '1234567890.123456',
                },
              ],
            },
          },
        },
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.getFileInfo({
        file: 'F123456',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://slack.com/api/files.info?file=F123456'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer xoxb-test-token',
          }),
        })
      );

      expect(result.ok).toBe(true);
      expect(result.file.id).toBe('F123456');
    });
  });

  describe('deleteFile', () => {
    it('should delete a file successfully', async () => {
      const mockResponse = {
        ok: true,
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.deleteFile({
        file: 'F123456',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://slack.com/api/files.delete',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer xoxp-test-token',
          }),
          body: JSON.stringify({ file: 'F123456' }),
        })
      );

      expect(result.ok).toBe(true);
    });

    it('should handle delete errors', async () => {
      const mockResponse = {
        ok: false,
        error: 'cant_delete_file',
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.deleteFile({
        file: 'F123456',
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('cant_delete_file');
    });
  });
});