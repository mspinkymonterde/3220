import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../src/config.js';

async function testGemini() {
  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  
  const modelsToTest = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-pro', 'models/gemini-1.5-flash'];
  
  for (const modelName of modelsToTest) {
    try {
      console.log(`Testing model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say hello world');
      console.log(`SUCCESS with ${modelName}:`, result.response.text());
      return; // Stop on first success
    } catch (err: any) {
      console.log(`FAILED with ${modelName}:`, err.status, err.statusText, err.message);
    }
  }
}

testGemini();
