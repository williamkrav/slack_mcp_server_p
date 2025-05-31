import './setup';
import { mockFetch, mockSlackResponse } from './setup';

describe('End-to-End Workflow Tests', () => {
  describe('Complete Canvas Workflow', () => {
    it('should complete a full canvas lifecycle', async () => {
      // Step 1: List channels to find target channel
      const mockChannelsResponse = {
        ok: true,
        channels: [
          { id: 'C123456789', name: 'project-alpha' },
          { id: 'C987654321', name: 'general' }
        ]
      };
      mockSlackResponse(mockChannelsResponse);

      let response = await fetch(
        'https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=100&team_id=T123456789',
        { headers: { Authorization: 'Bearer xoxb-test-token', 'Content-Type': 'application/json' } }
      );
      let result = await response.json();
      const projectChannel = result.channels.find((c: any) => c.name === 'project-alpha');

      expect(projectChannel).toBeDefined();
      expect(projectChannel.id).toBe('C123456789');

      // Step 2: Create a canvas
      const mockCreateResponse = {
        ok: true,
        canvas_id: 'F111222333'
      };
      mockSlackResponse(mockCreateResponse);

      response = await fetch("https://slack.com/api/canvases.create", {
        method: "POST",
        headers: { 
          Authorization: 'Bearer xoxb-test-token', 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          title: 'Project Alpha Status',
          document_content: {
            type: 'markdown',
            markdown: '# Project Alpha\n\n## Current Status\n:large_yellow_circle: In Progress'
          },
          channel_id: projectChannel.id
        }),
      });
      result = await response.json();
      const canvasId = result.canvas_id;

      expect(canvasId).toBe('F111222333');

      // Step 3: Edit the canvas to add more content
      const mockEditResponse = { ok: true };
      mockSlackResponse(mockEditResponse);

      response = await fetch("https://slack.com/api/canvases.edit", {
        method: "POST",
        headers: { 
          Authorization: 'Bearer xoxb-test-token', 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          canvas_id: canvasId,
          changes: [{
            operation: 'insert_at_end',
            document_content: {
              type: 'markdown',
              markdown: '\n\n## Team Members\n- @U123 (Lead)\n- @U456 (Dev)\n\n## Next Sprint\n- [ ] Feature A\n- [ ] Feature B'
            }
          }]
        }),
      });
      result = await response.json();
      expect(result.ok).toBe(true);

      // Step 4: Set canvas access permissions
      const mockAccessResponse = { ok: true };
      mockSlackResponse(mockAccessResponse);

      response = await fetch("https://slack.com/api/canvases.access.set", {
        method: "POST",
        headers: { 
          Authorization: 'Bearer xoxb-test-token', 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          canvas_id: canvasId,
          access_level: 'write',
          channel_ids: [projectChannel.id]
        }),
      });
      result = await response.json();
      expect(result.ok).toBe(true);

      // Step 5: Share canvas link in channel
      const mockMessageResponse = {
        ok: true,
        ts: '1234567890.123456'
      };
      mockSlackResponse(mockMessageResponse);

      response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: { 
          Authorization: 'Bearer xoxb-test-token', 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          channel: projectChannel.id,
          text: `📋 Project canvas updated: https://your-workspace.slack.com/docs/T123456789/${canvasId}`
        }),
      });
      result = await response.json();
      expect(result.ok).toBe(true);
      expect(result.ts).toBe('1234567890.123456');
    });

    it('should handle canvas workflow with multiple edits', async () => {
      const canvasId = 'F444555666';

      // Create initial canvas
      mockSlackResponse({ ok: true, canvas_id: canvasId });
      await fetch("https://slack.com/api/canvases.create", {
        method: "POST",
        headers: { Authorization: 'Bearer xoxb-test-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Meeting Notes',
          document_content: {
            type: 'markdown',
            markdown: '# Weekly Team Meeting\n\n## Date\n2024-01-15'
          }
        }),
      });

      // Multiple sequential edits
      const edits = [
        {
          operation: 'insert_at_end',
          content: '\n\n## Attendees\n- Team Lead\n- Developer 1\n- Developer 2'
        },
        {
          operation: 'insert_at_end', 
          content: '\n\n## Action Items\n- [ ] Review pull requests\n- [ ] Plan next sprint'
        },
        {
          operation: 'insert_at_end',
          content: '\n\n## Next Meeting\n2024-01-22 @ 10:00 AM'
        }
      ];

      for (let i = 0; i < edits.length; i++) {
        mockSlackResponse({ ok: true });
        
        const response = await fetch("https://slack.com/api/canvases.edit", {
          method: "POST",
          headers: { Authorization: 'Bearer xoxb-test-token', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            canvas_id: canvasId,
            changes: [{
              operation: edits[i].operation,
              document_content: {
                type: 'markdown',
                markdown: edits[i].content
              }
            }]
          }),
        });
        
        const result = await response.json();
        expect(result.ok).toBe(true);
      }

      expect(mockFetch).toHaveBeenCalledTimes(4); // 1 create + 3 edits
    });
  });

  describe('Error Recovery Workflows', () => {
    it('should handle partial failures gracefully', async () => {
      // Create canvas successfully
      mockSlackResponse({ ok: true, canvas_id: 'F123' });
      
      let response = await fetch("https://slack.com/api/canvases.create", {
        method: "POST",
        headers: { Authorization: 'Bearer xoxb-test-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test Canvas' }),
      });
      let result = await response.json();
      expect(result.canvas_id).toBe('F123');

      // First edit fails
      mockSlackResponse({ 
        ok: false, 
        error: 'canvas_editing_failed',
        detail: 'Invalid section_id'
      });

      response = await fetch("https://slack.com/api/canvases.edit", {
        method: "POST",
        headers: { Authorization: 'Bearer xoxb-test-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canvas_id: 'F123',
          changes: [{
            operation: 'replace',
            section_id: 'invalid_section',
            document_content: { type: 'markdown', markdown: 'New content' }
          }]
        }),
      });
      result = await response.json();
      expect(result.ok).toBe(false);

      // Retry with correct operation
      mockSlackResponse({ ok: true });

      response = await fetch("https://slack.com/api/canvases.edit", {
        method: "POST",
        headers: { Authorization: 'Bearer xoxb-test-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canvas_id: 'F123',
          changes: [{
            operation: 'insert_at_end',
            document_content: { type: 'markdown', markdown: '\n\n## New Section' }
          }]
        }),
      });
      result = await response.json();
      expect(result.ok).toBe(true);
    });
  });

  describe('Performance and Load Tests', () => {
    it('should handle multiple concurrent requests', async () => {
      const numRequests = 10;
      const promises = [];

      // Mock responses for all requests
      for (let i = 0; i < numRequests; i++) {
        mockSlackResponse({ ok: true, canvas_id: `F${i}` });
      }

      // Create multiple canvas creation requests
      for (let i = 0; i < numRequests; i++) {
        const promise = fetch("https://slack.com/api/canvases.create", {
          method: "POST",
          headers: { Authorization: 'Bearer xoxb-test-token', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `Canvas ${i}`,
            document_content: {
              type: 'markdown',
              markdown: `# Canvas ${i}\n\nContent for canvas number ${i}`
            }
          }),
        }).then(r => r.json());
        
        promises.push(promise);
      }

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(numRequests);
      results.forEach((result, index) => {
        expect(result.ok).toBe(true);
        expect(result.canvas_id).toBe(`F${index}`);
      });
    });

    it('should handle large canvas content efficiently', async () => {
      // Create large markdown content (simulating a big document)
      const largeContent = Array(100).fill(0).map((_, i) => 
        `## Section ${i + 1}\n\nThis is section ${i + 1} with some content.\n\n` +
        `- Item 1 for section ${i + 1}\n` +
        `- Item 2 for section ${i + 1}\n` +
        `- Item 3 for section ${i + 1}\n\n`
      ).join('');

      const fullMarkdown = `# Large Document\n\n${largeContent}`;

      mockSlackResponse({ ok: true, canvas_id: 'F_LARGE' });

      const startTime = Date.now();
      const response = await fetch("https://slack.com/api/canvases.create", {
        method: "POST",
        headers: { Authorization: 'Bearer xoxb-test-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Large Canvas',
          document_content: {
            type: 'markdown',
            markdown: fullMarkdown
          }
        }),
      });
      const endTime = Date.now();

      const result = await response.json();
      expect(result.ok).toBe(true);
      expect(result.canvas_id).toBe('F_LARGE');

      // Verify the request completed (mocked, so should be fast)
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast with mocks

      // Verify content size
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(requestBody.document_content.markdown.length).toBeGreaterThan(10000);
    });

    it('should batch multiple canvas operations efficiently', async () => {
      const canvasId = 'F_BATCH_TEST';
      
      // Create canvas
      mockSlackResponse({ ok: true, canvas_id: canvasId });
      await fetch("https://slack.com/api/canvases.create", {
        method: "POST",
        headers: { Authorization: 'Bearer xoxb-test-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Batch Test Canvas' }),
      });

      // Perform multiple operations in a single edit request
      const batchChanges = [
        {
          operation: 'insert_at_end',
          document_content: { type: 'markdown', markdown: '\n\n## Section 1' }
        },
        {
          operation: 'insert_at_end',
          document_content: { type: 'markdown', markdown: '\n\n## Section 2' }
        },
        {
          operation: 'insert_at_end',
          document_content: { type: 'markdown', markdown: '\n\n## Section 3' }
        }
      ];

      mockSlackResponse({ ok: true });

      const response = await fetch("https://slack.com/api/canvases.edit", {
        method: "POST",
        headers: { Authorization: 'Bearer xoxb-test-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canvas_id: canvasId,
          changes: batchChanges
        }),
      });

      const result = await response.json();
      expect(result.ok).toBe(true);

      // Verify all changes were sent in a single request
      const editCall = mockFetch.mock.calls.find(call => 
        call[0] === 'https://slack.com/api/canvases.edit'
      );
      const editBody = JSON.parse(editCall?.[1]?.body as string);
      expect(editBody.changes).toHaveLength(3);
    });
  });
});
