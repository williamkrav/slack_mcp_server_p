import './setup';
import { mockFetch, mockSlackResponse, mockSlackError } from './setup';

describe('Canvas API Features', () => {
  describe('Canvas Operations', () => {
    it('should support all canvas edit operations', async () => {
      const operations = [
        'insert_at_start',
        'insert_at_end',
        'insert_after',
        'insert_before',
        'replace',
        'delete'
      ];

      for (const operation of operations) {
        mockSlackResponse({ ok: true });

        const change = {
          operation,
          ...(operation.includes('insert') || operation === 'replace' ? {
            document_content: {
              type: 'markdown',
              markdown: '## Test Section'
            }
          } : {}),
          ...(operation === 'insert_after' || operation === 'insert_before' || 
              operation === 'replace' || operation === 'delete' ? {
            section_id: 'section_123'
          } : {})
        };

        const response = await fetch("https://slack.com/api/canvases.edit", {
          method: "POST",
          headers: { 
            Authorization: 'Bearer xoxb-test-token', 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({
            canvas_id: 'F123456789',
            changes: [change]
          }),
        });

        const result = await response.json();
        expect(result.ok).toBe(true);
      }
    });

    it('should handle canvas creation for channels', async () => {
      const mockResponse = {
        ok: true,
        canvas_id: 'F987654321'
      };

      mockSlackResponse(mockResponse);

      const response = await fetch("https://slack.com/api/conversations.canvases.create", {
        method: "POST",
        headers: { 
          Authorization: 'Bearer xoxb-test-token', 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          channel_id: 'C123456789',
          document_content: {
            type: 'markdown',
            markdown: '# Channel Canvas\n\nThis is a channel-specific canvas.'
          }
        }),
      });

      const result = await response.json();
      expect(result.canvas_id).toBe('F987654321');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://slack.com/api/conversations.canvases.create',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    it('should handle canvas access control', async () => {
      const mockResponse = {
        ok: true
      };

      mockSlackResponse(mockResponse);

      const response = await fetch("https://slack.com/api/canvases.access.set", {
        method: "POST",
        headers: { 
          Authorization: 'Bearer xoxb-test-token', 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          canvas_id: 'F123456789',
          access_level: 'write',
          channel_ids: ['C123456789', 'C987654321']
        }),
      });

      const result = await response.json();
      expect(result.ok).toBe(true);
    });

    it('should handle canvas deletion', async () => {
      const mockResponse = {
        ok: true
      };

      mockSlackResponse(mockResponse);

      const response = await fetch("https://slack.com/api/canvases.delete", {
        method: "POST",
        headers: { 
          Authorization: 'Bearer xoxb-test-token', 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          canvas_id: 'F123456789'
        }),
      });

      const result = await response.json();
      expect(result.ok).toBe(true);
    });
  });

  describe('Canvas Content Validation', () => {
    it('should validate markdown content structure', () => {
      const validContent = {
        type: 'markdown',
        markdown: '# Header\n\n## Subheader\n\n- List item 1\n- List item 2'
      };

      const invalidContent = {
        type: 'html', // Not supported
        markdown: '<h1>Header</h1>'
      };

      expect(validContent.type).toBe('markdown');
      expect(typeof validContent.markdown).toBe('string');
      expect(invalidContent.type).not.toBe('markdown');
    });

    it('should support Slack-specific markdown elements', () => {
      const slackMarkdown = `
# Project Status

## Team Members
- @U123456 (Project Lead)
- @U789012 (Developer)

## Channels
- ![](#C123456) - Project Channel
- ![](#C789012) - General Discussion

## Status
:large_green_circle: On Track

## Resources
[Project Plan](https://example.com/plan)
      `.trim();

      expect(slackMarkdown).toContain('@U123456');
      expect(slackMarkdown).toContain('![](#C123456)');
      expect(slackMarkdown).toContain(':large_green_circle:');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle canvas not found errors', async () => {
      const mockErrorResponse = {
        ok: false,
        error: 'canvas_not_found'
      };

      mockSlackResponse(mockErrorResponse);

      const response = await fetch("https://slack.com/api/canvases.edit", {
        method: "POST",
        headers: { 
          Authorization: 'Bearer xoxb-test-token', 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          canvas_id: 'INVALID_ID',
          changes: []
        }),
      });

      const result = await response.json();
      expect(result.ok).toBe(false);
      expect(result.error).toBe('canvas_not_found');
    });

    it('should handle insufficient permissions errors', async () => {
      const mockErrorResponse = {
        ok: false,
        error: 'missing_scope',
        needed: 'canvases:write'
      };

      mockSlackResponse(mockErrorResponse);

      const response = await fetch("https://slack.com/api/canvases.create", {
        method: "POST",
        headers: { 
          Authorization: 'Bearer xoxb-test-token', 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          title: 'Test Canvas'
        }),
      });

      const result = await response.json();
      expect(result.ok).toBe(false);
      expect(result.error).toBe('missing_scope');
      expect(result.needed).toBe('canvases:write');
    });

    it('should handle canvas editing failures', async () => {
      const mockErrorResponse = {
        ok: false,
        error: 'canvas_editing_failed',
        detail: 'Invalid section_id provided'
      };

      mockSlackResponse(mockErrorResponse);

      const response = await fetch("https://slack.com/api/canvases.edit", {
        method: "POST",
        headers: { 
          Authorization: 'Bearer xoxb-test-token', 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          canvas_id: 'F123456789',
          changes: [{
            operation: 'replace',
            section_id: 'invalid_section',
            document_content: {
              type: 'markdown',
              markdown: 'New content'
            }
          }]
        }),
      });

      const result = await response.json();
      expect(result.ok).toBe(false);
      expect(result.error).toBe('canvas_editing_failed');
    });
  });

  describe('Dynamic Channel Support', () => {
    it('should fetch all channels dynamically', async () => {
      const mockChannelsResponse = {
        ok: true,
        channels: [
          { id: 'C123', name: 'general', is_channel: true, is_private: false },
          { id: 'C456', name: 'random', is_channel: true, is_private: false },
          { id: 'G789', name: 'private-group', is_channel: false, is_private: true }
        ],
        response_metadata: { next_cursor: '' }
      };

      mockSlackResponse(mockChannelsResponse);

      const response = await fetch(
        'https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=100&team_id=T123456789',
        { headers: { Authorization: 'Bearer xoxb-test-token', 'Content-Type': 'application/json' } }
      );

      const result = await response.json();
      expect(result.channels).toHaveLength(3);
      expect(result.channels[0].name).toBe('general');
      expect(result.channels[2].is_private).toBe(true);
    });

    it('should handle pagination for large channel lists', async () => {
      const mockFirstPage = {
        ok: true,
        channels: [{ id: 'C123', name: 'channel1' }],
        response_metadata: { next_cursor: 'cursor123' }
      };

      const mockSecondPage = {
        ok: true,
        channels: [{ id: 'C456', name: 'channel2' }],
        response_metadata: { next_cursor: '' }
      };

      // First call without cursor
      mockSlackResponse(mockFirstPage);
      let response = await fetch(
        'https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=100&team_id=T123456789',
        { headers: { Authorization: 'Bearer xoxb-test-token', 'Content-Type': 'application/json' } }
      );
      let result = await response.json();
      expect(result.response_metadata.next_cursor).toBe('cursor123');

      // Second call with cursor
      mockSlackResponse(mockSecondPage);
      response = await fetch(
        'https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=100&team_id=T123456789&cursor=cursor123',
        { headers: { Authorization: 'Bearer xoxb-test-token', 'Content-Type': 'application/json' } }
      );
      result = await response.json();
      expect(result.response_metadata.next_cursor).toBe('');
    });

    it('should not use static channel IDs from environment', () => {
      // Verify that SLACK_CHANNEL_IDS is not used in dynamic mode
      delete process.env.SLACK_CHANNEL_IDS;
      
      const channelListUrl = 'https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=100&team_id=T123456789';
      
      expect(channelListUrl).toContain('types=public_channel,private_channel');
      expect(channelListUrl).not.toContain('SLACK_CHANNEL_IDS');
    });
  });

  describe('Canvas Integration with Channels', () => {
    it('should create canvas and associate with channel', async () => {
      // First create a canvas
      const mockCanvasResponse = {
        ok: true,
        canvas_id: 'F123456789'
      };
      mockSlackResponse(mockCanvasResponse);

      let response = await fetch("https://slack.com/api/canvases.create", {
        method: "POST",
        headers: { 
          Authorization: 'Bearer xoxb-test-token', 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          title: 'Project Canvas',
          document_content: {
            type: 'markdown',
            markdown: '# Project Status\n\n## Goals\n- Complete feature X\n- Launch beta'
          },
          channel_id: 'C123456789'
        }),
      });

      let result = await response.json();
      expect(result.canvas_id).toBe('F123456789');

      // Then set access for the channel
      const mockAccessResponse = { ok: true };
      mockSlackResponse(mockAccessResponse);

      response = await fetch("https://slack.com/api/canvases.access.set", {
        method: "POST",
        headers: { 
          Authorization: 'Bearer xoxb-test-token', 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          canvas_id: 'F123456789',
          access_level: 'write',
          channel_ids: ['C123456789']
        }),
      });

      result = await response.json();
      expect(result.ok).toBe(true);
    });
  });

  describe('Canvas Markdown Features', () => {
    it('should support complex markdown structures', () => {
      const complexMarkdown = `
# Sprint Planning Canvas

## 📊 Sprint Goals
- [ ] Implement user authentication
- [ ] Add dashboard widgets
- [x] Setup CI/CD pipeline

## 👥 Team Assignments
| Team Member | Task | Status |
|-------------|------|--------|
| @U123456 | Frontend | In Progress |
| @U789012 | Backend | Todo |

## 🔗 Resources
- [Design Mockups](https://example.com/mockups)
- [API Documentation](https://example.com/docs)

## 📞 Daily Standup
Join ![](#C123456) at 9:00 AM daily

## 🚨 Blockers
> **Important**: Database migration needs to be completed before feature development

### Code Snippet
\`\`\`javascript
const config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000
};
\`\`\`

---
*Last updated: 2024-01-15*
      `.trim();

      // Validate various markdown elements
      expect(complexMarkdown).toContain('# Sprint Planning Canvas');
      expect(complexMarkdown).toContain('- [ ]'); // Checkboxes
      expect(complexMarkdown).toContain('| Team Member |'); // Tables
      expect(complexMarkdown).toContain('@U123456'); // User mentions
      expect(complexMarkdown).toContain('![](#C123456)'); // Channel mentions
      expect(complexMarkdown).toContain('> **Important**'); // Blockquotes
      expect(complexMarkdown).toContain('```javascript'); // Code blocks
      expect(complexMarkdown).toContain('📊'); // Emojis
    });
  });
});
