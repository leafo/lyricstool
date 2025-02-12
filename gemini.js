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

const OCR_LYRICS_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    lyrics: {
      type: "string",
      description: "The lyrics extracted from the image. Only the lyrics, no additional text that is not a lyric in the song. Separate logical sections with a an empty line."
    },
    title: {
      type: "string",
      description: "The title of the song, if available"
    },
    artist: {
      type: "string",
      description: "The artist of the song, if available"
    },
    notes: {
      type: "string",
      description: "If a chord progression is visible in the image, return the chord progression in minimal notation, eg. C G Am F C"
    }
  },
  required: [
    "lyrics"
  ]
}

export async function ocrLyrics(file) {
  const apiKey = await config.getValue("gemini_api_key");

  if (!apiKey) {
    return Promise.reject('config.gemini_api_key is not set');
  }

  const generationConfig = {
    responseMimeType: "application/json",
    responseSchema: OCR_LYRICS_RESPONSE_SCHEMA
  }

  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const base64Data = base64.split(',')[1];
  const mimeType = file.type;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: "Extract the lyrics, song title, and chord progression if available from the image. Return the title and notes only if they are present in the image. Focus on accurately extracting lyrics. ",
          },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          }
        ]
      }
    ],
    generationConfig
  };


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

  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0].text) {
      return Promise.reject(new Error("Unexpected response format from Gemini API"));
  }


  const finishReason = data.candidates[0].finishReason;
  if (finishReason !== 'STOP') {
    return Promise.reject(new Error(`Gemini did not finish with STOP reason: ${finishReason}`));
  }


  try {
    return JSON.parse(data.candidates[0].content.parts[0].text);
  } catch (e) {
    return Promise.reject(new Error(`Failed to parse JSON response from Gemini: ${e.message} - Raw response text: ${data.candidates[0].content.parts[0].text}`));
  }
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





