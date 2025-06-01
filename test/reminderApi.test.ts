import { mockFetch, mockSlackResponse, mockSlackError } from './setup';

// Reminder API type definitions
interface RemindersAddArgs {
  text: string;
  time: string | number;
  user?: string;
}

interface RemindersListArgs {
  user?: string;
}

interface RemindersDeleteArgs {
  reminder: string;
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

  async addReminder(args: RemindersAddArgs): Promise<any> {
    const response = await fetch("https://slack.com/api/reminders.add", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SLACK_USER_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: args.text,
        time: args.time,
        user: args.user,
      }),
    });

    return response.json();
  }

  async listReminders(args: RemindersListArgs): Promise<any> {
    const params = new URLSearchParams();
    if (args.user) params.append("user", args.user);

    const response = await fetch(
      `https://slack.com/api/reminders.list?${params}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SLACK_USER_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.json();
  }

  async deleteReminder(args: RemindersDeleteArgs): Promise<any> {
    const response = await fetch("https://slack.com/api/reminders.delete", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SLACK_USER_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reminder: args.reminder,
      }),
    });

    return response.json();
  }
}

describe('Reminder API', () => {
  let slackClient: SlackClient;

  beforeEach(() => {
    process.env.SLACK_USER_TOKEN = 'xoxp-test-token';
    slackClient = new SlackClient('xoxb-test-token');
  });

  afterEach(() => {
    delete process.env.SLACK_USER_TOKEN;
  });

  describe('addReminder', () => {
    it('should add a reminder with timestamp successfully', async () => {
      const mockResponse = {
        ok: true,
        reminder: {
          id: 'Rm123456',
          creator: 'U123456',
          user: 'U123456',
          text: 'Review the project proposal',
          recurring: false,
          time: 1234567890,
          complete_ts: 0,
        },
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.addReminder({
        text: 'Review the project proposal',
        time: 1234567890,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://slack.com/api/reminders.add',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer xoxp-test-token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            text: 'Review the project proposal',
            time: 1234567890,
          }),
        })
      );

      expect(result.ok).toBe(true);
      expect(result.reminder.id).toBe('Rm123456');
    });

    it('should add a reminder with natural language time', async () => {
      const mockResponse = {
        ok: true,
        reminder: {
          id: 'Rm789012',
          creator: 'U123456',
          user: 'U123456',
          text: 'Team meeting',
          recurring: false,
          time: 1234567890,
          complete_ts: 0,
        },
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.addReminder({
        text: 'Team meeting',
        time: 'tomorrow at 3pm',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://slack.com/api/reminders.add',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            text: 'Team meeting',
            time: 'tomorrow at 3pm',
          }),
        })
      );

      expect(result.ok).toBe(true);
    });

    it('should add a reminder for another user', async () => {
      const mockResponse = {
        ok: true,
        reminder: {
          id: 'Rm345678',
          creator: 'U123456',
          user: 'U789012',
          text: 'Submit timesheet',
          recurring: false,
          time: 1234567890,
          complete_ts: 0,
        },
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.addReminder({
        text: 'Submit timesheet',
        time: 'Friday at 5pm',
        user: 'U789012',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://slack.com/api/reminders.add',
        expect.objectContaining({
          body: JSON.stringify({
            text: 'Submit timesheet',
            time: 'Friday at 5pm',
            user: 'U789012',
          }),
        })
      );

      expect(result.reminder.user).toBe('U789012');
    });
  });

  describe('listReminders', () => {
    it('should list reminders successfully', async () => {
      const mockResponse = {
        ok: true,
        reminders: [
          {
            id: 'Rm123456',
            creator: 'U123456',
            user: 'U123456',
            text: 'Review the project proposal',
            recurring: false,
            time: 1234567890,
            complete_ts: 0,
          },
          {
            id: 'Rm789012',
            creator: 'U123456',
            user: 'U123456',
            text: 'Team meeting',
            recurring: true,
            time: 1234567891,
            complete_ts: 0,
          },
        ],
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.listReminders({});

      expect(mockFetch).toHaveBeenCalledWith(
        'https://slack.com/api/reminders.list?',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer xoxp-test-token',
          }),
        })
      );

      expect(result.ok).toBe(true);
      expect(result.reminders).toHaveLength(2);
      expect(result.reminders[0].id).toBe('Rm123456');
      expect(result.reminders[1].id).toBe('Rm789012');
    });

    it('should list reminders for a specific user', async () => {
      const mockResponse = {
        ok: true,
        reminders: [
          {
            id: 'Rm345678',
            creator: 'U123456',
            user: 'U789012',
            text: 'Submit timesheet',
            recurring: false,
            time: 1234567890,
            complete_ts: 0,
          },
        ],
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.listReminders({
        user: 'U789012',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('user=U789012'),
        expect.any(Object)
      );

      expect(result.reminders[0].user).toBe('U789012');
    });
  });

  describe('deleteReminder', () => {
    it('should delete a reminder successfully', async () => {
      const mockResponse = {
        ok: true,
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.deleteReminder({
        reminder: 'Rm123456',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://slack.com/api/reminders.delete',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer xoxp-test-token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            reminder: 'Rm123456',
          }),
        })
      );

      expect(result.ok).toBe(true);
    });

    it('should handle delete errors', async () => {
      const mockResponse = {
        ok: false,
        error: 'not_found',
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.deleteReminder({
        reminder: 'Rm999999',
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('not_found');
    });
  });
});