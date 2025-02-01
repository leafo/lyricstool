import { config } from './config.js';

const CHUNK_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    chunks: {
      type: "array",
      items: {
        type: "string"
      }
    }
  },
  required: [
    "chunks"
  ]
}

export async function gemini(prompt, options={}) {
  const apiKey = await config.getValue("gemini_api_key")

  if (!apiKey) {
    return Promise.reject('config.gemini_api_key is not set');
  }

  const generationConfig = {
    temperature: options.temperature,
  }

  if (options.response_format) {
    generationConfig.responseMimeType = "application/json"
    generationConfig.responseSchema = options.response_format
  }

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: prompt
          }
        ]
      }
    ],
    generationConfig
  };

  if (options.system) {
    requestBody.systemInstruction = {
      role: "user",
      parts: [
        {
          text: options.system
        }
      ]
    }
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json();
    return Promise.reject(new Error(errorData.error.message));
  }

  const data = await response.json();
  const finishReason = data.candidates[0].finishReason;
  if (finishReason !== 'STOP') {
    return Promise.reject(new Error(`Gemini did not finish with STOP reason: ${finishReason}`));
  }

  return data.candidates[0].content.parts[0].text;
}

export async function chunkLyrics(lyrics) {
  const response = await gemini(lyrics, {
    system: "You are helping reformat the lyrics of a song into a list of chunks that are of suitable length to be memorized one at a time so that a person can memorize the entire lyrics incrementally",
    response_format: CHUNK_RESPONSE_SCHEMA
  });

  return JSON.parse(response);
}
