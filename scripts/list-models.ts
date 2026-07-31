import { config } from '../src/config.js';

async function listModels() {
  try {
    console.log('Fetching available models...');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${config.geminiApiKey}`);
    
    if (!response.ok) {
      console.log('HTTP Error:', response.status, response.statusText);
      const text = await response.text();
      console.log('Response body:', text);
      return;
    }
    
    const data = await response.json();
    console.log('Models found:', data.models.length);
    for (const model of data.models) {
      console.log(`- ${model.name} (Methods: ${model.supportedGenerationMethods.join(', ')})`);
    }
  } catch (err: any) {
    console.error('Failed to list models:', err);
  }
}

listModels();
