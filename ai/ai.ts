import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import Anthropic from "@anthropic-ai/sdk";

const anthropicAPIKey = secret("AnthropicAPIKey");

const client = () => new Anthropic({ apiKey: anthropicAPIKey() });

export interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: Message[];
}

interface ChatResponse {
  content?: string;
  toolUse: any;
}

const tools: Anthropic.Tool[] = [
  {
    name: "create_arrow_sandbox",
    description:
      'Produce arguments for @arrow-js/sandbox. Build this UI as an Arrow sandbox payload. Return an object for sandbox({ source, ... }) with exactly one entry file named main.ts or main.js, plus main.css only if styles are needed. Use @arrow-js/core primitives directly: reactive(...) for state, html`...` for DOM, and component(...) only when reusable local state or composition is actually needed. Arrow expression slots are static by default, so any live value must be wrapped in a callable function like ${() => state.count}. Use event bindings like @click="${() => state.count++}", do not use JSX, React hooks, Vue directives, direct DOM mutation, or framework-specific render APIs. Do not use IDL property bindings like ".value". Arrow.js only allows expressions in **text content**, **node positions** (between tags), or **attribute values** — not as a raw expression in the tag body between attributes. All browser globals like document, window, and localStorage are not available for use. Export a default Arrow template or component result from main.ts. Keep the example self-contained, prefer a single clear root view, and communicate back to the host with output(payload) when needed. Put CSS in main.css, keep payloads JSON-serializable, and only return the files that are necessary for the requested interface. If you create multiple files, make sure imports match the virtual filenames you place in source.',
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        source: {
          type: "object",
          description:
            "Virtual files passed to sandbox({ source }). Must include main.ts or main.js. main.css is optional.",
          additionalProperties: false,
          properties: {
            "main.ts": {
              type: "string",
              description: "Main Arrow TypeScript entry file.",
            },
            "main.js": {
              type: "string",
              description: "Main Arrow JavaScript entry file.",
            },
            "main.css": {
              type: "string",
              description: "Optional stylesheet for the sandbox root.",
            },
          },
          anyOf: [{ required: ["main.ts"] }, { required: ["main.js"] }],
        },
        shadowDOM: {
          type: "boolean",
          description: "Whether the sandbox should render inside shadow DOM.",
        },
        debug: {
          type: "boolean",
          description: "Whether sandbox debug logging should be enabled.",
        },
      },
      required: ["source"],
    },
  },
];

export const sendMessage = api(
  { expose: true, method: "POST", path: "/ai/sendMessage" },
  async ({ messages }: ChatRequest): Promise<ChatResponse> => {
    const response = await client().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 16_384,
      tools,
      tool_choice: { type: "auto" },
      messages,
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    return { content: text !== "" ? text : undefined, toolUse };
  },
);
