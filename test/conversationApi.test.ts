import { mockFetch, mockSlackResponse, mockSlackError } from './setup';

// Channel/Conversation Management API type definitions
interface ConversationCreateArgs {
  name: string;
  is_private?: boolean;
  team_id?: string;
}

interface ConversationArchiveArgs {
  channel: string;
}

interface ConversationInviteArgs {
  channel: string;
  users: string;
}

interface ConversationRenameArgs {
  channel: string;
  name: string;
}

interface ConversationSetPurposeArgs {
  channel: string;
  purpose: string;
}

interface ConversationJoinArgs {
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

  async createConversation(args: ConversationCreateArgs): Promise<any> {
    const response = await fetch("https://slack.com/api/conversations.create", {
      method: "POST",
      headers: this.botHeaders,
      body: JSON.stringify({
        name: args.name,
        is_private: args.is_private || false,
        team_id: args.team_id,
      }),
    });

    return response.json();
  }

  async archiveConversation(args: ConversationArchiveArgs): Promise<any> {
    const response = await fetch("https://slack.com/api/conversations.archive", {
      method: "POST",
      headers: this.botHeaders,
      body: JSON.stringify({
        channel: args.channel,
      }),
    });

    return response.json();
  }

  async inviteToConversation(args: ConversationInviteArgs): Promise<any> {
    const response = await fetch("https://slack.com/api/conversations.invite", {
      method: "POST",
      headers: this.botHeaders,
      body: JSON.stringify({
        channel: args.channel,
        users: args.users,
      }),
    });

    return response.json();
  }

  async renameConversation(args: ConversationRenameArgs): Promise<any> {
    const response = await fetch("https://slack.com/api/conversations.rename", {
      method: "POST",
      headers: this.botHeaders,
      body: JSON.stringify({
        channel: args.channel,
        name: args.name,
      }),
    });

    return response.json();
  }

  async setConversationPurpose(args: ConversationSetPurposeArgs): Promise<any> {
    const response = await fetch("https://slack.com/api/conversations.setPurpose", {
      method: "POST",
      headers: this.botHeaders,
      body: JSON.stringify({
        channel: args.channel,
        purpose: args.purpose,
      }),
    });

    return response.json();
  }

  async joinConversation(args: ConversationJoinArgs): Promise<any> {
    const response = await fetch("https://slack.com/api/conversations.join", {
      method: "POST",
      headers: this.botHeaders,
      body: JSON.stringify({
        channel: args.channel,
      }),
    });

    return response.json();
  }
}

describe('Conversation Management API', () => {
  let slackClient: SlackClient;

  beforeEach(() => {
    slackClient = new SlackClient('xoxb-test-token');
  });

  describe('createConversation', () => {
    it('should create a public channel successfully', async () => {
      const mockResponse = {
        ok: true,
        channel: {
          id: 'C123456',
          name: 'new-channel',
          is_channel: true,
          is_private: false,
          created: 1234567890,
          creator: 'U123456',
        },
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.createConversation({
        name: 'new-channel',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://slack.com/api/conversations.create',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer xoxb-test-token',
          }),
          body: JSON.stringify({
            name: 'new-channel',
            is_private: false,
          }),
        })
      );

      expect(result.ok).toBe(true);
      expect(result.channel.name).toBe('new-channel');
      expect(result.channel.is_private).toBe(false);
    });

    it('should create a private channel successfully', async () => {
      const mockResponse = {
        ok: true,
        channel: {
          id: 'G123456',
          name: 'private-channel',
          is_channel: false,
          is_private: true,
          is_group: true,
          created: 1234567890,
          creator: 'U123456',
        },
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.createConversation({
        name: 'private-channel',
        is_private: true,
      });

      expect(result.ok).toBe(true);
      expect(result.channel.is_private).toBe(true);
    });

    it('should handle channel name conflicts', async () => {
      const mockResponse = {
        ok: false,
        error: 'name_taken',
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.createConversation({
        name: 'existing-channel',
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('name_taken');
    });
  });

  describe('archiveConversation', () => {
    it('should archive a channel successfully', async () => {
      const mockResponse = {
        ok: true,
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.archiveConversation({
        channel: 'C123456',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://slack.com/api/conversations.archive',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            channel: 'C123456',
          }),
        })
      );

      expect(result.ok).toBe(true);
    });

    it('should handle already archived channels', async () => {
      const mockResponse = {
        ok: false,
        error: 'already_archived',
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.archiveConversation({
        channel: 'C123456',
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('already_archived');
    });
  });

  describe('inviteToConversation', () => {
    it('should invite users to a channel successfully', async () => {
      const mockResponse = {
        ok: true,
        channel: {
          id: 'C123456',
          name: 'general',
        },
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.inviteToConversation({
        channel: 'C123456',
        users: 'U123456,U789012',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://slack.com/api/conversations.invite',
        expect.objectContaining({
          body: JSON.stringify({
            channel: 'C123456',
            users: 'U123456,U789012',
          }),
        })
      );

      expect(result.ok).toBe(true);
    });
  });

  describe('renameConversation', () => {
    it('should rename a channel successfully', async () => {
      const mockResponse = {
        ok: true,
        channel: {
          id: 'C123456',
          name: 'renamed-channel',
        },
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.renameConversation({
        channel: 'C123456',
        name: 'renamed-channel',
      });

      expect(result.ok).toBe(true);
      expect(result.channel.name).toBe('renamed-channel');
    });
  });

  describe('setConversationPurpose', () => {
    it('should set channel purpose successfully', async () => {
      const mockResponse = {
        ok: true,
        purpose: 'This channel is for project updates',
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.setConversationPurpose({
        channel: 'C123456',
        purpose: 'This channel is for project updates',
      });

      expect(result.ok).toBe(true);
      expect(result.purpose).toBe('This channel is for project updates');
    });
  });

  describe('joinConversation', () => {
    it('should join a channel successfully', async () => {
      const mockResponse = {
        ok: true,
        channel: {
          id: 'C123456',
          name: 'general',
        },
        warning: null,
        response_metadata: {
          warnings: [],
        },
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.joinConversation({
        channel: 'C123456',
      });

      expect(result.ok).toBe(true);
      expect(result.channel.id).toBe('C123456');
    });
  });
});