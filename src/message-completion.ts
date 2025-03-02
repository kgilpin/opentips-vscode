import {
  CancellationTokenSource,
  LanguageModelChat,
  LanguageModelChatMessage,
  LanguageModelChatMessageRole,
  LanguageModelChatResponse,
  LanguageModelTextPart,
  lm,
  window,
  MessageOptions,
  commands,
  QuickPickItem,
  extensions,
} from "vscode";
import { logger } from "./logger";
import { OpenTipsJSONRPCClient } from "./rpc-client";
import extractCode from "./extract-code";
import { getCopilotModelProviderId, setCopilotModelProviderId } from "./settings";

// TODO: Define completion types and guards
type CompletionResult = string | object | undefined;

// Add these type definitions and guards
type JsonObject = Record<string, unknown>;
type StringResult = string;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringResult(value: unknown): value is StringResult {
  return typeof value === "string";
}

function isValidCompletionResult(value: unknown): value is CompletionResult {
  return value === undefined || isStringResult(value) || isJsonObject(value);
}

// At this time, claude-3.5-sonnet provides the best completion results.
const DEFAULT_MODEL_PROVIDER_ID = "claude-3.5-sonnet";

interface LanguageModelItem extends QuickPickItem {
  id: string;
}

export async function isCopilotLMProviderAvailable(): Promise<boolean> {
  // Access the Copilot extension
  const extension = extensions.getExtension("github.copilot");
  if (!extension) return false;

  await extension.activate();

  const models = await lm.selectChatModels();
  return models.length > 0;
}

/**
 * Obtains a language model for message completion. The model id may be stored in the settings,
 * or the user may be prompted to select a model.
 *
 * @returns A LanguageModelChat instance if a model is successfully selected,
 * or undefined if:
 * - No language models are available
 * - User dismissed the model selection dialog
 * - User canceled the error message dialog
 */
async function selectModel(): Promise<LanguageModelChat | undefined> {
  const models = await lm.selectChatModels();
  if (models.length === 0) {
    const messageOptions: MessageOptions = {
      modal: true,
    };

    const selection = await window.showErrorMessage(
      "No language model provider is available for OpenTips.\nPlease review the setup instructions.",
      messageOptions,
      "Open Instructions"
    );

    if (selection === "Open Instructions") {
      await commands.executeCommand("opentips.showLanguageModelWalkthrough");
    }

    return;
  }

  let model: LanguageModelChat | undefined;
  let modelId = getCopilotModelProviderId();

  if (modelId) model = models.find((model) => model.id === modelId);
  if (model) return model;

  const languageModelItems: LanguageModelItem[] = models.map((model) => ({
    id: model.id,
    label: model.name,
    picked: model.id === DEFAULT_MODEL_PROVIDER_ID,
    alwaysShow: model.id === DEFAULT_MODEL_PROVIDER_ID,
  }));

  const modelItem = await window.showQuickPick(languageModelItems);
  if (modelItem) model = models.find((model) => model.id === modelItem.id);
  // This error is handled silently, because the normal case in which it happens is when the user cancels the selection.
  // Otherwise, there's really no way that the selected model name wouldn't be found in the list of models.
  if (!model) return;

  setCopilotModelProviderId(model.id);
  return model;
}

/**
 * Completes a message by sending it to a language model and returning the result.
 *
 * @returns The completion result, or undefined if:
 * - No language model is available or user canceled model selection
 * - The language model request failed
 * - JSON parsing failed (when schema is provided)
 * - The RPC client is not available
 */
async function llmComplete(
  prompt: string,
  userRequest: string,
  temperature: number,
  schema?: string | object
): Promise<CompletionResult> {
  const model = await selectModel();
  if (!model) return;

  const messages: LanguageModelChatMessage[] = [
    {
      name: "prompt",
      role: LanguageModelChatMessageRole.Assistant,
      content: [new LanguageModelTextPart(prompt)],
    },
  ];

  if (schema) {
    messages.push({
      name: "schemaPrompt",
      role: LanguageModelChatMessageRole.Assistant,
      content: [new LanguageModelTextPart("Your response should conform to the following schema:")],
    });
    messages.push({
      name: "schemaData",
      role: LanguageModelChatMessageRole.Assistant,
      content: [new LanguageModelTextPart(JSON.stringify(schema))],
    });
  }

  messages.push({
    name: "user",
    role: LanguageModelChatMessageRole.User,
    content: [new LanguageModelTextPart(userRequest)],
  });

  const cancellationTokenSource = new CancellationTokenSource();

  // TODO: Is it possible to propagate the temperature and schema?
  // const modelOptions: { [name: string]: any } = {
  // Value type is "any" because that's how it's defined by vscode
  // temperature,
  // };
  // if (schema) modelOptions.schema = schema;

  let response: LanguageModelChatResponse;
  try {
    response = await model.sendRequest(messages, {}, cancellationTokenSource.token);
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    logger(`[message-completion] Failed to complete message: ${message}`);
    return;
  }

  const chunks: string[] = [];
  // This string handling is appropriate for the size and complexity of the response
  for await (const message of response.text) {
    chunks.push(message);
  }

  const buffer = chunks.join("");
  logger(`[message-completion] ${buffer}`);

  if (!schema) return buffer;

  // If a schema is provided, we assume the response is JSON
  // The raw buffer has to be pre-processed, e.g. stripping fences, because Copilot doesn't appear to handle structured / schema-driven output.
  const jsonData = extractCode(buffer);
  try {
    return JSON.parse(jsonData);
  } catch (error) {
    logger(`[message-completion] Failed to parse completion response: ${error}`);
    logger(buffer);
    return;
  }
}

/**
 * Processes a completion request by sending it to a language model and returning the result.
 *
 * @param rpcClientProvider Function that provides access to the RPC client
 * @param requestId Identifier for the completion request
 * @param prompt System prompt to send to the language model
 * @param userRequest User query to complete
 * @param temperature Model temperature setting (higher = more creative)
 * @param schema Optional schema for structured response
 * @returns The completion result, or undefined if:
 *   - No language model is available or user canceled model selection
 *   - The language model request failed
 *   - JSON parsing failed (when schema is provided)
 *   - The RPC client is not available
 */
export default async function complete(
  rpcClientProvider: () => OpenTipsJSONRPCClient | undefined,
  requestId: string,
  prompt: string,
  userRequest: string,
  temperature: number,
  schema?: string
): Promise<CompletionResult> {
  const result = await llmComplete(prompt, userRequest, temperature, schema);

  // Use type guard to validate result
  if (!isValidCompletionResult(result)) {
    logger(`[message-completion] Invalid response type for ${requestId}: ${typeof result}`);
    return;
  }

  if (result === undefined) {
    logger(`[message-completion] No response for ${requestId}`);
    return;
  }

  const rpcClient = rpcClientProvider();
  if (!rpcClient) {
    logger("[message-completion] No RPC client available");
    return;
  }

  try {
    // Type is now guaranteed to be string or object
    rpcClient.completeResponse(requestId, result);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    logger(`[message-completion] Error sending completion response: ${message}`);
    return;
  }
}
