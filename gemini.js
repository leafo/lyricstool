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
      description: "The lyrics extracted from the image. Only the lyrics text should be included, no additional text that is not a lyric like section labels. Separate logical sections with a an empty line."
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

const OCR_MEASURES_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "The title of the song, if visible in the image"
    },
    artist: {
      type: "string",
      description: "The artist of the song, if visible in the image"
    },
    measures: {
      type: "array",
      items: {
        type: "object",
        properties: {
          measureNumber: {
            type: "number",
            description: "The sequential number of the measure (starting from 1)"
          },
          numberOfBeats: {
            type: "number",
            description: "The number of beats in this measure (typically 4 for 4/4 time)"
          },
          chords: {
            type: "array",
            items: {
              type: "object",
              properties: {
                chord: {
                  type: "string",
                  description: "The chord symbol (e.g., 'C', 'Am', 'F7', 'G/B')"
                },
                beat: {
                  type: "number",
                  description: "The beat number where this chord appears (1-based)"
                }
              },
              required: ["chord", "beat"]
            }
          },
          lyrics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: {
                  type: "string",
                  description: "The lyric text for this beat"
                },
                beat: {
                  type: "number",
                  description: "The beat number where this lyric appears (1-based)"
                }
              },
              required: ["text", "beat"]
            }
          }
        },
        required: ["measureNumber", "numberOfBeats", "chords", "lyrics"]
      }
    }
  },
  required: ["measures"]
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
            text: "Extract the lyrics, song title, and chord progression if available from the image. Return the title and notes only if they are present in the image. Focus on accurately extracting lyrics. Only include lyrics that are to be sung and not any section labels.",
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

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
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

export async function ocrMeasures(file) {
  const apiKey = await config.getValue("gemini_api_key");

  if (!apiKey) {
    return Promise.reject('config.gemini_api_key is not set');
  }

  const generationConfig = {
    responseMimeType: "application/json",
    responseSchema: OCR_MEASURES_RESPONSE_SCHEMA
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
            text: `Analyze this sheet music image and extract the song information and musical measures with their beats, chords, and lyrics.

First, look for song metadata:
- Extract the song title if visible in the image
- Extract the artist name if visible in the image

Then, for each measure:
1. Identify the measure boundaries and number them sequentially starting from 1
2. Determine the number of beats per measure (typically 4 for 4/4 time signature)
3. Extract chord symbols (like C, Am, F7, G/B) and identify which beat they appear on
4. Extract lyrics and identify which beat they align with
5. Use 1-based beat numbering (beats 1, 2, 3, 4 for a 4/4 measure)

Guidelines:
- Only include title and artist if they are clearly visible in the image
- If a chord spans multiple beats, only record it on the beat where it first appears
- If lyrics span multiple beats, break them into syllables aligned with beats when possible
- If a word is split across beats, use hyphens to indicate the split (e.g., "beau-" on beat 1, "-ti-" on beat 2, "-ful" on beat 3)
- If no chord is present on a beat, omit it from the chords array
- If no lyrics are present on a beat, omit it from the lyrics array
- Be precise about beat positioning based on visual alignment in the sheet music
- For complex rhythms, do your best to align text with the most appropriate beat`,
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

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
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

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
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





