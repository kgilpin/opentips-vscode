import { APP } from "./extension";
import { logger } from "./extension-point/logger";
import invokeWithErrorReporting from "./report-error";
import resolveWorkspaceFolder from "./resolve-workspace-folder";
import { OpenTipsJSONRPCClient } from "./rpc-client";

export type TipId = {
  version: string;
  directory: string;
  id: string;
};

export function decodeTipId(encodedTipId: string): TipId {
  // id_parts = (
  //     "1.0".encode("utf-8"),
  //     directory.encode("utf-8"),
  //     tip_id.encode("utf-8"),
  // )
  // return base64.urlsafe_b64encode(b"\n".join(id_parts)).rstrip(b"=").decode("ascii")
  const decoded = Buffer.from(encodedTipId, "base64").toString("utf8");
  const lines = decoded.split("\n");
  let version: string, directory: string, id: string;
  if (lines.length === 3) {
    [version, directory, id] = lines;
    if (version !== "1.0" && version !== "1.1") throw new Error(`Unsupported tip id version: ${version}`);
  } else {
    throw new Error(`Invalid tip id: ${encodedTipId}`);
  }

  // TODO: Consider other lines length?

  return { version, directory, id };
}

export interface Tip {
  id: string;
  directory: string;
  file: string;
  line: number;
  type: string;
  label: string;
  description: string;
  priority: string;
  complexity: string;
  context: string;
}

export interface TipList {
  tips: Tip[];
  error?: string;
}

export interface TipDeleted {
  tip_id: string;
  reason: string;
}

export interface CompleteRequest {
  request_id: string;
  directory: string;
  prompt: string;
  user_message: string;
  temperature: number;
  response_format: string | undefined;
}

export type Explanation = string;

export interface TipEvent {
  type: string;
  data: Record<string, any>; // This is the most refined we can get without defining specific subtypes for events. Which, I guess would be a good idea.
}

export class Tips {
  static resolveTip(tip: Tip | string) {
    if (typeof tip === "string") return this.fetchTip(tip);

    return tip;
  }

  static async listTips(directory: string, limit?: number) {
    // TIPS invokeRPC is not needed here
    const rpcClient = APP.newRpcClient(directory);
    if (!rpcClient) {
      return;
    }

    return invokeWithErrorReporting("listing tips", () => rpcClient.listTips(limit));
  }

  static async suggest(directory: string) {
    // TIPS invokeRPC is not needed here
    const rpcClient = APP.newRpcClient(directory);
    if (!rpcClient) {
      return;
    }

    return invokeWithErrorReporting("listing tips", () => rpcClient.suggest());
  }

  static async fetchTip(tip: string | Tip) {
    return this.invokeRPC("fetching tip", tip, (rpcClient, id) => rpcClient.fetchTip(id));
  }

  static async explainTip(tip: string | Tip) {
    return this.invokeRPC("explaining tip", tip, (rpcClient, id) => rpcClient.explainTip(id));
  }

  static async applyTip(tip: string | Tip) {
    return this.invokeRPC("applying tip", tip, (rpcClient, id) => rpcClient.applyTip(id));
  }

  static async deleteTip(tip: string | Tip) {
    return this.invokeRPC("dismissing tip", tip, (rpcClient, id) => rpcClient.deleteTip(id));
  }

  protected static invokeRPC<T>(
    description: string,
    tip: string | Tip,
    rpc: (rpcClient: OpenTipsJSONRPCClient, id: string) => Promise<T>
  ): Promise<T | undefined> {
    let directory: string, tipId: string;
    if (typeof tip === "string") {
      tipId = tip;
      ({ directory } = decodeTipId(tip));
    } else {
      tipId = tip.id;
      ({ directory } = tip);
    }

    const folder = resolveWorkspaceFolder(directory);
    if (!folder) {
      logger(`[tips] Could not resolve workspace folder for ${directory}`);
      return Promise.resolve(undefined);
    }

    const rpcClient = APP.newRpcClient(folder.uri.fsPath);
    if (!rpcClient) {
      return Promise.resolve(undefined);
    }

    return invokeWithErrorReporting(description, () => rpc(rpcClient, tipId));
  }
}
