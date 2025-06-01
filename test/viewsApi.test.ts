import { mockFetch, mockSlackResponse, mockSlackError } from './setup';

// Views API type definitions
interface ViewsOpenArgs {
  trigger_id: string;
  view: {
    type: "modal";
    title: {
      type: "plain_text";
      text: string;
    };
    blocks: any[];
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
  view_id: string;
  view: {
    type: "modal";
    title: {
      type: "plain_text";
      text: string;
    };
    blocks: any[];
  };
  hash?: string;
}

interface ViewsPushArgs {
  trigger_id: string;
  view: {
    type: "modal";
    title: {
      type: "plain_text";
      text: string;
    };
    blocks: any[];
  };
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

  async openView(args: ViewsOpenArgs): Promise<any> {
    const response = await fetch("https://slack.com/api/views.open", {
      method: "POST",
      headers: this.botHeaders,
      body: JSON.stringify({
        trigger_id: args.trigger_id,
        view: args.view,
      }),
    });

    return response.json();
  }

  async updateView(args: ViewsUpdateArgs): Promise<any> {
    const response = await fetch("https://slack.com/api/views.update", {
      method: "POST",
      headers: this.botHeaders,
      body: JSON.stringify({
        view_id: args.view_id,
        view: args.view,
        hash: args.hash,
      }),
    });

    return response.json();
  }

  async pushView(args: ViewsPushArgs): Promise<any> {
    const response = await fetch("https://slack.com/api/views.push", {
      method: "POST",
      headers: this.botHeaders,
      body: JSON.stringify({
        trigger_id: args.trigger_id,
        view: args.view,
      }),
    });

    return response.json();
  }
}

describe('Views API', () => {
  let slackClient: SlackClient;

  beforeEach(() => {
    slackClient = new SlackClient('xoxb-test-token');
  });

  describe('openView', () => {
    it('should open a modal successfully', async () => {
      const mockResponse = {
        ok: true,
        view: {
          id: 'V123456',
          team_id: 'T123456',
          type: 'modal',
          title: {
            type: 'plain_text',
            text: 'User Form',
          },
          blocks: [
            {
              type: 'input',
              block_id: 'name_input',
              element: {
                type: 'plain_text_input',
                action_id: 'name',
              },
              label: {
                type: 'plain_text',
                text: 'Name',
              },
            },
          ],
          hash: '1234567890.abcdef',
          state: {
            values: {},
          },
        },
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.openView({
        trigger_id: '12345.98765.abcd',
        view: {
          type: 'modal',
          title: {
            type: 'plain_text',
            text: 'User Form',
          },
          blocks: [
            {
              type: 'input',
              block_id: 'name_input',
              element: {
                type: 'plain_text_input',
                action_id: 'name',
              },
              label: {
                type: 'plain_text',
                text: 'Name',
              },
            },
          ],
          submit: {
            type: 'plain_text',
            text: 'Submit',
          },
          close: {
            type: 'plain_text',
            text: 'Cancel',
          },
          callback_id: 'user_form_submit',
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://slack.com/api/views.open',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer xoxb-test-token',
          }),
          body: expect.stringContaining('trigger_id'),
        })
      );

      expect(result.ok).toBe(true);
      expect(result.view.id).toBe('V123456');
      expect(result.view.type).toBe('modal');
    });

    it('should handle expired trigger ID', async () => {
      const mockResponse = {
        ok: false,
        error: 'expired_trigger_id',
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.openView({
        trigger_id: 'expired.trigger.id',
        view: {
          type: 'modal',
          title: {
            type: 'plain_text',
            text: 'Test Modal',
          },
          blocks: [],
        },
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('expired_trigger_id');
    });
  });

  describe('updateView', () => {
    it('should update a view successfully', async () => {
      const mockResponse = {
        ok: true,
        view: {
          id: 'V123456',
          team_id: 'T123456',
          type: 'modal',
          title: {
            type: 'plain_text',
            text: 'Updated Form',
          },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: 'Form updated successfully!',
              },
            },
          ],
          hash: '1234567890.fedcba',
        },
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.updateView({
        view_id: 'V123456',
        view: {
          type: 'modal',
          title: {
            type: 'plain_text',
            text: 'Updated Form',
          },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: 'Form updated successfully!',
              },
            },
          ],
        },
        hash: '1234567890.abcdef',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://slack.com/api/views.update',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('view_id'),
        })
      );

      expect(result.ok).toBe(true);
      expect(result.view.title.text).toBe('Updated Form');
    });

    it('should handle hash conflicts', async () => {
      const mockResponse = {
        ok: false,
        error: 'hash_conflict',
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.updateView({
        view_id: 'V123456',
        view: {
          type: 'modal',
          title: {
            type: 'plain_text',
            text: 'Updated Form',
          },
          blocks: [],
        },
        hash: 'outdated.hash',
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('hash_conflict');
    });
  });

  describe('pushView', () => {
    it('should push a new view successfully', async () => {
      const mockResponse = {
        ok: true,
        view: {
          id: 'V789012',
          team_id: 'T123456',
          type: 'modal',
          title: {
            type: 'plain_text',
            text: 'Second Modal',
          },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'plain_text',
                text: 'This is the second modal in the stack',
              },
            },
          ],
          hash: '1234567890.ghijkl',
          root_view_id: 'V123456',
          previous_view_id: 'V123456',
        },
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.pushView({
        trigger_id: '12345.98765.abcd',
        view: {
          type: 'modal',
          title: {
            type: 'plain_text',
            text: 'Second Modal',
          },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'plain_text',
                text: 'This is the second modal in the stack',
              },
            },
          ],
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://slack.com/api/views.push',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('trigger_id'),
        })
      );

      expect(result.ok).toBe(true);
      expect(result.view.id).toBe('V789012');
      expect(result.view.root_view_id).toBe('V123456');
    });

    it('should handle stack limit errors', async () => {
      const mockResponse = {
        ok: false,
        error: 'view_stack_limit_exceeded',
      };

      mockSlackResponse(mockResponse);

      const result = await slackClient.pushView({
        trigger_id: '12345.98765.abcd',
        view: {
          type: 'modal',
          title: {
            type: 'plain_text',
            text: 'Too Many Modals',
          },
          blocks: [],
        },
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('view_stack_limit_exceeded');
    });
  });
});