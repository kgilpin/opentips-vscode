import { APP } from "./extension";

export default function newRpcClient(directory: string) {
  const rpcClient = APP.newRpcClient(directory);
  if (!rpcClient) {
    throw new Error(`Failed to create RPC client for directory: ${directory}`);
  }
  return rpcClient;
}
