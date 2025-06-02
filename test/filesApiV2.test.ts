import { mockFetch, mockSlackResponse, mockSlackError } from './setup';

// Files API v2 type definitions
interface FilesGetUploadURLExternalArgs {
  filename: string;
  length: number;
  alt_txt?: string;
}

interface FilesCompleteUploadExternalArgs {
  files: Array<{
    id: string;
    title?: string;
  }>;
  channel_id?: string;
  initial_comment?: string;
  thread_ts?: string;
}

interface FilesUploadArgs {
  content?: string;
  filename?: string;
  filetype?: string;
  title?: string;
  initial_comment?: string;
  channels?: string[];
  thread_ts?: string;
}

// Extract SlackClient class for testing
class SlackClient {
  private userHeaders: { Authorization: string; "Content-Type": string };

  constructor(botToken: string) {
    this.userHeaders = {
      Authorization: `Bearer ${process.env.SLACK_USER_TOKEN}`,
      "Content-Type": "application/json",
    };
  }

  async getUploadURLExternal(args: FilesGetUploadURLExternalArgs): Promise<any> {
    const response = await fetch("https://slack.com/api/files.getUploadURLExternal", {
      method: "POST",
      headers: this.userHeaders,
      body: JSON.stringify({
        filename: args.filename,
        length: args.length,
        alt_text: args.alt_txt,
      }),
    });

    return response.json();
  }

  async completeUploadExternal(args: FilesCompleteUploadExternalArgs): Promise<any> {
    const response = await fetch("https://slack.com/api/files.completeUploadExternal", {
      method: "POST",
      headers: this.userHeaders,
      body: JSON.stringify({
        files: args.files,
        channel_id: args.channel_id,
        initial_comment: args.initial_comment,
        thread_ts: args.thread_ts,
      }),
    });

    return response.json();
  }

  async uploadFile_v2(args: FilesUploadArgs): Promise<any> {
    if (!args.content || !args.filename) {
      throw new Error('Content and filename are required for file upload');
    }

    // Step 1: Get upload URL
    const uploadUrlResponse = await this.getUploadURLExternal({
      filename: args.filename,
      length: Buffer.byteLength(args.content, 'utf8'),
    });

    if (!uploadUrlResponse.ok) {
      return uploadUrlResponse;
    }

    const { upload_url, file_id } = uploadUrlResponse;

    // Step 2: Upload file to the URL
    try {
      const uploadResponse = await fetch(upload_url, {
        method: 'POST',
        body: args.content,
        headers: {
          'Content-Type': args.filetype || 'text/plain',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      // Step 3: Complete the upload
      const completeResponse = await this.completeUploadExternal({
        files: [{
          id: file_id,
          title: args.title || args.filename,
        }],
        channel_id: args.channels?.[0],
        initial_comment: args.initial_comment,
        thread_ts: args.thread_ts,
      });

      return completeResponse;
    } catch (error) {
      throw error;
    }
  }
}

describe('Files API v2', () => {
  let slackClient: SlackClient;

  beforeEach(() => {
    process.env.SLACK_USER_TOKEN = 'xoxp-test-token';
    slackClient = new SlackClient('xoxb-test-token');
  });

  afterEach(() => {
    delete process.env.SLACK_USER_TOKEN;
  });

  describe('getUploadURLExternal', () => {
    it('should get upload URL successfully', async () => {
      const mockResponse = {
        ok: true,
        upload_url: 'https://files.slack.com/upload/v1/abc123',
        file_id: 'F123456',
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.getUploadURLExternal({
        filename: 'test.txt',
        length: 1234,
        alt_txt: 'A test file',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://slack.com/api/files.getUploadURLExternal',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer xoxp-test-token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            filename: 'test.txt',
            length: 1234,
            alt_text: 'A test file',
          }),
        })
      );

      expect(result.ok).toBe(true);
      expect(result.upload_url).toBe('https://files.slack.com/upload/v1/abc123');
      expect(result.file_id).toBe('F123456');
    });

    it('should handle errors when getting upload URL', async () => {
      const mockResponse = {
        ok: false,
        error: 'invalid_auth',
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.getUploadURLExternal({
        filename: 'test.txt',
        length: 1234,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('invalid_auth');
    });
  });

  describe('completeUploadExternal', () => {
    it('should complete upload successfully', async () => {
      const mockResponse = {
        ok: true,
        files: [
          {
            id: 'F123456',
            title: 'Test File',
            name: 'test.txt',
            mimetype: 'text/plain',
            size: 1234,
            url_private: 'https://files.slack.com/files-pri/T123456-F123456/test.txt',
          },
        ],
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.completeUploadExternal({
        files: [{ id: 'F123456', title: 'Test File' }],
        channel_id: 'C123456',
        initial_comment: 'This is a test file',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://slack.com/api/files.completeUploadExternal',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer xoxp-test-token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            files: [{ id: 'F123456', title: 'Test File' }],
            channel_id: 'C123456',
            initial_comment: 'This is a test file',
            thread_ts: undefined,
          }),
        })
      );

      expect(result.ok).toBe(true);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].id).toBe('F123456');
    });

    it('should handle errors when completing upload', async () => {
      const mockResponse = {
        ok: false,
        error: 'file_not_found',
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.completeUploadExternal({
        files: [{ id: 'F999999' }],
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('file_not_found');
    });
  });

  describe('uploadFile_v2', () => {
    it('should perform complete v2 upload flow successfully', async () => {
      // Mock response for getUploadURLExternal
      mockSlackResponse({
        ok: true,
        upload_url: 'https://files.slack.com/upload/v1/abc123',
        file_id: 'F123456',
      });

      // Mock response for the actual file upload to external URL
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
      } as Response);

      // Mock response for completeUploadExternal
      mockSlackResponse({
        ok: true,
        files: [
          {
            id: 'F123456',
            title: 'Test File',
            name: 'test.txt',
            mimetype: 'text/plain',
            size: 13,
          },
        ],
      });

      const result = await slackClient.uploadFile_v2({
        content: 'Hello, world!',
        filename: 'test.txt',
        title: 'Test File',
        channels: ['C123456'],
        initial_comment: 'This is a test file',
      });

      // Verify getUploadURLExternal was called
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://slack.com/api/files.getUploadURLExternal',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            filename: 'test.txt',
            length: 13,
            alt_text: undefined,
          }),
        })
      );

      // Verify file upload was called
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://files.slack.com/upload/v1/abc123',
        expect.objectContaining({
          method: 'POST',
          body: 'Hello, world!',
          headers: expect.objectContaining({
            'Content-Type': 'text/plain',
          }),
        })
      );

      // Verify completeUploadExternal was called
      expect(mockFetch).toHaveBeenNthCalledWith(
        3,
        'https://slack.com/api/files.completeUploadExternal',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            files: [{ id: 'F123456', title: 'Test File' }],
            channel_id: 'C123456',
            initial_comment: 'This is a test file',
            thread_ts: undefined,
          }),
        })
      );

      expect(result.ok).toBe(true);
      expect(result.files).toHaveLength(1);
    });

    it('should handle errors in v2 upload flow', async () => {
      // Mock error response for getUploadURLExternal
      mockSlackResponse({
        ok: false,
        error: 'invalid_auth',
      });

      const result = await slackClient.uploadFile_v2({
        content: 'Hello, world!',
        filename: 'test.txt',
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('invalid_auth');
    });

    it('should throw error when content or filename is missing', async () => {
      await expect(slackClient.uploadFile_v2({
        filename: 'test.txt',
      })).rejects.toThrow('Content and filename are required for file upload');

      await expect(slackClient.uploadFile_v2({
        content: 'Hello, world!',
      })).rejects.toThrow('Content and filename are required for file upload');
    });
  });
});