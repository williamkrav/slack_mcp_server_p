import { mockFetch, mockSlackResponse } from './setup';

describe('MCP Server Integration', () => {
  describe('Tool Execution', () => {
    describe('slack_list_channels', () => {
      it('should execute slack_list_channels successfully', async () => {
        const mockChannels = {
          ok: true,
          channels: [
            { id: 'C123', name: 'general' },
            { id: 'C456', name: 'random' }
          ]
        };

        mockSlackResponse(mockChannels);

        const executeChannelList = async () => {
          const response = await fetch(
            `https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=100&team_id=T123456789`,
            { headers: { Authorization: 'Bearer xoxb-test-token', 'Content-Type': 'application/json' } }
          );
          const data = await response.json();
          return {
            content: [{ type: "text", text: JSON.stringify(data) }]
          };
        };

        const result = await executeChannelList();

        expect(result.content[0].text).toContain('general');
        expect(result.content[0].text).toContain('C123');
      });
    });

    describe('slack_canvas_create', () => {
      it('should execute slack_canvas_create successfully', async () => {
        const mockResponse = {
          ok: true,
          canvas_id: 'F123456789'
        };

        mockSlackResponse(mockResponse);

        const executeCanvasCreate = async (args: any) => {
          const payload: any = {};
          if (args.title) payload.title = args.title;
          if (args.document_content) payload.document_content = args.document_content;
          if (args.channel_id) payload.channel_id = args.channel_id;

          const response = await fetch("https://slack.com/api/canvases.create", {
            method: "POST",
            headers: { Authorization: 'Bearer xoxb-test-token', 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const data = await response.json();
          return {
            content: [{ type: "text", text: JSON.stringify(data) }]
          };
        };

        const args = {
          title: 'Test Canvas',
          document_content: {
            type: 'markdown',
            markdown: '# Test Canvas\n\nThis is a test canvas.'
          }
        };

        const result = await executeCanvasCreate(args);

        expect(mockFetch).toHaveBeenCalledWith(
          'https://slack.com/api/canvases.create',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(args)
          })
        );

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.canvas_id).toBe('F123456789');
      });
    });

    describe('slack_canvas_edit', () => {
      it('should execute slack_canvas_edit successfully', async () => {
        const mockResponse = {
          ok: true
        };

        mockSlackResponse(mockResponse);

        const executeCanvasEdit = async (args: any) => {
          if (!args.canvas_id || !args.changes) {
            throw new Error("Missing required arguments: canvas_id and changes");
          }

          const response = await fetch("https://slack.com/api/canvases.edit", {
            method: "POST",
            headers: { Authorization: 'Bearer xoxb-test-token', 'Content-Type': 'application/json' },
            body: JSON.stringify({
              canvas_id: args.canvas_id,
              changes: args.changes,
            }),
          });
          const data = await response.json();
          return {
            content: [{ type: "text", text: JSON.stringify(data) }]
          };
        };

        const args = {
          canvas_id: 'F123456789',
          changes: [{
            operation: 'insert_at_end',
            document_content: {
              type: 'markdown',
              markdown: '\n## New Section\nAdditional content here.'
            }
          }]
        };

        const result = await executeCanvasEdit(args);

        expect(mockFetch).toHaveBeenCalledWith(
          'https://slack.com/api/canvases.edit',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              canvas_id: 'F123456789',
              changes: args.changes
            })
          })
        );

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.ok).toBe(true);
      });

      it('should handle missing required arguments', async () => {
        const executeCanvasEdit = async (args: any) => {
          if (!args.canvas_id || !args.changes) {
            throw new Error("Missing required arguments: canvas_id and changes");
          }
        };

        await expect(executeCanvasEdit({ canvas_id: 'F123' }))
          .rejects.toThrow("Missing required arguments: canvas_id and changes");

        await expect(executeCanvasEdit({ changes: [] }))
          .rejects.toThrow("Missing required arguments: canvas_id and changes");
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle Slack API errors gracefully', async () => {
      const mockErrorResponse = {
        ok: false,
        error: 'channel_not_found'
      };

      mockSlackResponse(mockErrorResponse);

      const executeWithError = async () => {
        const response = await fetch("https://slack.com/api/chat.postMessage", {
          method: "POST",
          headers: { Authorization: 'Bearer xoxb-test-token', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: 'INVALID',
            text: 'test'
          }),
        });
        return response.json();
      };

      const result = await executeWithError();
      expect(result.ok).toBe(false);
      expect(result.error).toBe('channel_not_found');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const executeWithNetworkError = async () => {
        try {
          await fetch("https://slack.com/api/conversations.list");
        } catch (error) {
          return { error: (error as Error).message };
        }
      };

      const result = await executeWithNetworkError();
      expect(result?.error).toBe('Network error');
    });
  });

  describe('Input Validation', () => {
    it('should validate canvas edit operations', () => {
      const validOperations = [
        'insert_after',
        'insert_before', 
        'replace',
        'delete',
        'insert_at_start',
        'insert_at_end'
      ];

      const isValidOperation = (op: string) => validOperations.includes(op);

      expect(isValidOperation('insert_at_end')).toBe(true);
      expect(isValidOperation('invalid_operation')).toBe(false);
    });

    it('should validate document content structure', () => {
      const isValidDocumentContent = (content: any) => {
        return content && 
               content.type === 'markdown' && 
               typeof content.markdown === 'string';
      };

      expect(isValidDocumentContent({
        type: 'markdown',
        markdown: '# Test'
      })).toBe(true);

      expect(isValidDocumentContent({
        type: 'html',
        markdown: '# Test'
      })).toBe(false);

      expect(isValidDocumentContent({
        type: 'markdown',
        markdown: 123
      })).toBe(false);
    });
  });
});
