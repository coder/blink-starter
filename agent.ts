import { type Message, Scout } from "@blink-sdk/scout-agent";
import { type LanguageModel, streamText } from "ai";
import type { ProviderOptions } from "@ai-sdk/provider-utils";
import * as blink from "blink";
import { SYSTEM_PROMPT } from "./prompt";

export const agent = new blink.Agent<Message>();

const scout = new Scout({
  agent,
  // GitHub integration (optional).
  // Run `blink setup github-app` to set up your GitHub App, or remove this section if not needed.
  github: {
    appID: process.env.GITHUB_APP_ID,
    privateKey: process.env.GITHUB_PRIVATE_KEY,
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
  },
  // Slack integration (optional).
  // Run `blink setup slack-app` to set up your Slack App, or remove this section if not needed.
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
  },
  // Web search integration (optional). Visit https://exa.ai to get an API key.
  webSearch: {
    exaApiKey: process.env.EXA_API_KEY,
  },
  // Compute environment for running code.
  // For production, you can use Coder (https://coder.com):
  // compute: {
  //   type: "coder",
  //   options: {
  //     url: process.env.CODER_URL,
  //     sessionToken: process.env.CODER_SESSION_TOKEN,
  //     template: process.env.CODER_TEMPLATE,
  //     presetName: process.env.CODER_PRESET_NAME,
  //   },
  // },
});

agent.on("request", async (request) => {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/slack")) {
    return scout.handleSlackWebhook(request);
  }
  if (url.pathname.startsWith("/github")) {
    return scout.handleGitHubWebhook(request);
  }
  return new Response("Hey there!", { status: 200 });
});

agent.on("chat", async ({ id, messages }) => {
  let model: LanguageModel = "anthropic/claude-opus-4.5";
  let providerOptions: ProviderOptions = {
    anthropic: { cacheControl: { type: "ephemeral" } },
  };

  if (process.env.OPENAI_API_KEY) {
    const { openai } = await import("@ai-sdk/openai");
    model = openai.chat("gpt-5.2");
    providerOptions = {};
  } else if (process.env.ANTHROPIC_API_KEY) {
    const { anthropic } = await import("@ai-sdk/anthropic");
    model = anthropic("claude-opus-4-5");
  }

  const params = await scout.buildStreamTextParams({
    systemPrompt: SYSTEM_PROMPT,
    messages,
    chatID: id,
    model,
    providerOptions,
    tools: {
      // add your custom tools here
    },
  });
  return streamText(params);
});

agent.serve();
