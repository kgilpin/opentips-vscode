import { JSONRPCClient, JSONRPCResponse } from "json-rpc-2.0";

import EventEmitter from "events";
import { logger } from "./extension-point/logger";
import { decodeTipId, Tip, TipEvent } from "./tips";
import assert from "assert";

const FETCH_TIMEOUT = 60 * 1000;

/**
 * Patch the tip object to ensure it has all required fields. This ensures that
 * older tip data can be loaded into the newer tip model.
 */
function patchTip(tipData: Partial<Tip>): Tip {
  // Ensure the tip has "priority"
  // If there are problems with this or other tip format migrations, parse the tip id
  // to extract the version, id digest, and directory and utilize the version information.
  assert(tipData.id, "Tip id is required");
  const tipId = decodeTipId(tipData.id);

  if (tipId.version === "1.0") {
    if (!tipData.priority) {
      logger(`[rpc-client] Setting priority=medium for tip ${tipId.id} (tip version is 1.0)`);
      tipData.priority = "medium";
    }
  }
  return tipData as Tip;
}

/**
 * JSON-RPC client for the OpenTips server.
 */
export class OpenTipsJSONRPCClient {
  client: JSONRPCClient<void>;

  constructor(port: number, timeout: number = FETCH_TIMEOUT) {
    const client = new JSONRPCClient(
      async (jsonRPCRequest): Promise<void> =>
        fetch(`http://localhost:${port}/rpc`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(jsonRPCRequest),
        }).then((response: Response) => {
          if (response.status === 200) {
            // Use client.receive when you received a JSON-RPC response.
            return response
              .json()
              .then((jsonRPCResponse) => client.receive(jsonRPCResponse as JSONRPCResponse | JSONRPCResponse[]));
          }

          return Promise.reject(new Error(response.statusText ?? "Unknown error"));
        })
    );

    client.timeout(timeout);
    this.client = client;
  }

  async fetchTip(tipId: string): Promise<Tip> {
    logger(`[rpc-client] Fetching tip ${tipId}`);
    return patchTip(await this.client.request("fetch_tip", { tip_id: tipId }));
  }

  async listTips(limit?: number): Promise<Tip[]> {
    logger(`[rpc-client] Listing tips`);
    const params: any = {};
    if (limit) params.limit = limit;

    return (await this.client.request("list_tips", params)).map(patchTip);
  }

  async suggest(newOnly = false): Promise<void> {
    logger(`[rpc-client] Suggesting tips`);
    const params: any = {
      new_only: newOnly,
    };

    await this.client.request("suggest", params);
  }

  async explainTip(tipId: string): Promise<string> {
    logger(`[rpc-client] Explaining tip ${tipId}`);
    // At this time, the response is an object with a single key, "explanation".
    // In the future, there might be more fields.
    const { explanation } = await this.client.request("explain_tip", { tip_id: tipId });
    return explanation;
  }

  async applyTip(tipId: string) {
    // TODO: Patches will be emitted via "patches" event:
    // "patches",
    // {
    //     "tip_id": self.tip.model_dump(),
    //     "patches": [patch.model_dump() for patch in patches],
    // },
    // The client may choose to not await the response of this method, and
    // instead listen for the "patches" event to examine the patches.
    logger(`[rpc-client] Applying tip ${tipId}`);
    // TODO: apply_tip should have a "delete" option to delete the tip after applying it.
    // Tip deletion should emit an event that the client can listen for to update the UI.
    // This event will look like this:
    // "tip_deleted",
    // {
    //     "tip_id": tip_id,
    // },
    await this.client.request("apply_tip", { tip_id: tipId });
  }

  async deleteTip(tipId: string) {
    logger(`[rpc-client] Deleting tip ${tipId}`);
    await this.client.request("delete_tip", { tip_id: tipId });
  }

  /**
   * Notify the server that a file has changed.
   */
  async changed(fileNames: string[]) {
    logger(`[rpc-client] Notifying server of changes to ${fileNames.length} files. The first file is ${fileNames[0]}`);
    await this.client.request("changed", { file_names: fileNames });
  }

  async pollForEvents(): Promise<TipEvent[]> {
    // Don't log this because it happens on a frequent schedule.
    // logger(`[rpc-client] Polling for events`);
    return await this.client.request("poll_events", {});
  }

  async completeResponse(requestId: string, response: string | object) {
    return await this.client.request("complete_response", { request_id: requestId, response: response });
  }
}

const INITIAL_POLL_INTERVAL = 250;

class OpenTipsPollingClient {
  private pollInterval = INITIAL_POLL_INTERVAL;
  private shutdown = false;

  constructor(port: number, listener: (type: string, data: any) => void) {
    const client = new OpenTipsJSONRPCClient(port);

    // TODO: Implement an exponential backoff strategy for polling.
    // When files are being modified, shorten the poll interval. When no files are being modified, lengthen the poll interval.
    const poll = async () => {
      let events: Array<{ type: string; data: any }> = [];
      try {
        events = await client.pollForEvents();
      } catch (error) {
        const message = error instanceof Error ? error.message : JSON.stringify(error);
        logger(`[rpc-events] Error polling for events: ${message}`);
      } finally {
        if (!this.shutdown) {
          schedulePoll();
        }
      }
      for (const e of events) {
        logger(`[rpc-events] Received event: ${e.type}`);
        listener(e.type, e.data);
      }
    };

    const schedulePoll = () => {
      setTimeout(poll, this.pollInterval);
    };

    schedulePoll();
  }

  close() {
    this.shutdown = true;
  }
}

export class OpenTipsEvents extends EventEmitter {
  private clientByFolder = new Map<string, OpenTipsPollingClient | undefined>();

  portChanged(folder: string, port: number | undefined) {
    const eventsClient = this.clientByFolder.get(folder);
    if (eventsClient) {
      eventsClient.close();
    }

    if (port) {
      logger(`[rpc-events] Events polling service connecting to RPC server on port ${port} for folder ${folder}`);
      const pollingClient = new OpenTipsPollingClient(port, this.emit.bind(this));
      this.clientByFolder.set(folder, pollingClient);
    }
  }
}
