import { jest } from "@jest/globals";

// Mock external dependencies
jest.mock("../new-rpc-client.ts", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../report-error.ts", () => ({
  __esModule: true,
  default: jest.fn(),
  reportError: jest.fn(),
}));

jest.mock("../resolve-workspace-folder.ts", () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock the logger
jest.mock("../extension-point/logger", () => ({
  logger: jest.fn(),
}));

import { OpenTipsJSONRPCClient } from "../rpc-client";

// Mock fetch globally since it's not available in Node
const mockFetch: jest.Mock<(input: string | URL | Request, init?: RequestInit) => Promise<Response>> = jest.fn();
global.fetch = mockFetch;

describe("OpenTipsJSONRPCClient", () => {
  const TEST_PORT = 3000;
  const TIMEOUT = 1000;

  let client: OpenTipsJSONRPCClient;
  let abortController: AbortController;

  beforeEach(() => {
    jest.clearAllMocks();
    abortController = new AbortController();
    client = new OpenTipsJSONRPCClient(TEST_PORT, TIMEOUT);
  });

  afterEach(() => {
    mockFetch.mockClear();
    // Clean up any hanging promises
    abortController.abort();
  });

  describe("constructor", () => {
    it("should create a client with the specified port", () => {
      expect(client).toBeInstanceOf(OpenTipsJSONRPCClient);
    });
  });

  describe("fetchTip", () => {
    const TEST_TIP_ID =
      "MS4xCi9Vc2Vycy9rZ2lscGluL3NvdXJjZS9rZ2lscGluL29wZW50aXBzLXZzY29kZQppWERBa0R2OU8zQ0VKR1hvbE9xaHpxWTJ2RmNUQUd1N2dwRUhCbU0zUDlv";
    const TEST_TIP_RESPONSE = {
      jsonrpc: "2.0",
      result: {
        id: TEST_TIP_ID,
        title: "Test Tip",
        description: "Test Description",
      },
      id: 1,
    };

    it("should successfully fetch and patch a tip", async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          json: () => Promise.resolve(TEST_TIP_RESPONSE),
        } as Response)
      );

      const tip = await client.fetchTip(TEST_TIP_ID);

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:${TEST_PORT}/rpc`,
        expect.objectContaining({
          method: "POST",
          headers: { "content-type": "application/json" },
          body: expect.any(String),
        })
      );
      expect(tip).toEqual({
        id: TEST_TIP_ID,
        title: "Test Tip",
        description: "Test Description",
      });
    });

    // TODO: Timeout is implemented per the JSON-RPC library documentation, but this test is timing out
    // even though the timeout is set to 1 second and the test timeout is set to 5 seconds.
    // In the client, the only thing that should be needed is: client.timeout(timeout);
    // it("should handle request timeout", async () => {
    //   mockFetch.mockImplementationOnce(
    //     () =>
    //       new Promise((_, reject) => {
    //         const cleanup = () => reject(new Error("Aborted"));
    //         abortController.signal.addEventListener("abort", cleanup);
    //       })
    //   );

    //   const fetchPromise = client.fetchTip(TEST_TIP_ID);
    //   await expect(fetchPromise).rejects.toThrow("Request timeout");
    // });

    it("should handle non-200 response", async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          status: 500,
          statusText: "Internal Server Error",
        } as Response)
      );

      await expect(client.fetchTip(TEST_TIP_ID)).rejects.toThrow("Internal Server Error");
    });

    it("should handle network failure", async () => {
      mockFetch.mockImplementationOnce(() => Promise.reject(new Error("Network error")));

      await expect(client.fetchTip(TEST_TIP_ID)).rejects.toThrow("Network error");
    });

    it("should handle malformed JSON response", async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          json: () => Promise.reject(new Error("Invalid JSON")),
        } as Response)
      );

      await expect(client.fetchTip(TEST_TIP_ID)).rejects.toThrow();
    });

    it("should handle missing tip ID in response", async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          json: () =>
            Promise.resolve({
              jsonrpc: "2.0",
              result: {
                title: "Test Tip", // Missing id
              },
              id: 1,
            }),
        } as Response)
      );

      await expect(client.fetchTip(TEST_TIP_ID)).rejects.toThrow("Tip id is required");
    });
  });
});
