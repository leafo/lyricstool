
import { config } from './config.js';

export async function chatgpt(prompt, options={}) {
  const apiKey = await config.getValue("openai_api_key")

  if (!apiKey) {
    return Promise.reject('config.openai_api_key is not set');
  }

  const messages = [
    { role: 'user', content: prompt }
  ]

  if (options.system) {
    messages.unshift({ role: 'system', content: options.system })
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: options.model || 'gpt-4o',
      messages: messages,
      response_format: options.response_format,
      temperature: options.temperature,
    })
  });

  if (!response.ok) {
    const errorData = await response.json();

    const err = new Error(errorData.error.message)
    err.openAIError = errorData.error;

    return Promise.reject(err);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

const CHUNK_RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "chunk_response",
    schema: {
      type: "object",
      required: ["chunks"],
      additionalProperties: false,
      properties: {
        chunks: {
          type: "array",
          description: "A chunk of the lyrics suitable for memorizating individually",
          items: {
            type: "string",
          }
        }
      }
    }
  }
}

// convert lyrics string into memorization chunks
export async function chunkLyrics(lyrics) {
  const response = await chatgpt(lyrics, {
    system: "You are helping reformat the lyrics of a song into a list of chunks that are of suitable length to be memorized one at a time so that a person can memorize the entire lyrics incrementally. You are being provided the full lyrics to process and you have permission to print them back as provided. You are not reproducing any external copyrighted works but only processing the input you have been provided.",
    response_format: CHUNK_RESPONSE_FORMAT,
  })

  return JSON.parse(response);
}

