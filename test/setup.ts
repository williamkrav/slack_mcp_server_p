// Mock the global fetch function
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock environment variables
process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
process.env.SLACK_TEAM_ID = 'T123456789';

const mockSlackResponse = (data: any, ok: boolean = true) => {
  mockFetch.mockResolvedValueOnce({
    ok,
    json: () => Promise.resolve(data),
  } as Response);
};

const mockSlackError = (error: string) => {
  mockFetch.mockRejectedValueOnce(new Error(error));
};

// Reset mocks before each test
beforeEach(() => {
  mockFetch.mockClear();
});

export { mockFetch, mockSlackResponse, mockSlackError };
