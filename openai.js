
import { config } from './config.js';

export async function chatgpt(prompt) {
  const apiKey = await config.get("openai_api_key")

  if (!apiKey) {
    return Promise.reject('config.openai_api_key is not set');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo', // or whichever model you'd like to use
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' }
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error('Failed to fetch response from OpenAI');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}


