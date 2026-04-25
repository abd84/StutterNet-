import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const API_KEY = process.env.VITE_GEMINI_API_KEY;

async function testGeminiAPI() {
  console.log('🚀 Testing Gemini API...');
  
  if (!API_KEY || API_KEY === 'your-gemini-api-key-here') {
    console.error('❌ API key not found. Check your .env.local file');
    return;
  }
  
  console.log('✅ API key found:', API_KEY.substring(0, 10) + '...');
  
  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    // List available models
    console.log('\n📋 Listing available models...');
    const models = await genAI.listModels();
    
    console.log('\n🎯 Available models:');
    models.forEach((model) => {
      console.log(`- ${model.name}`);
      if (model.supportedGenerationMethods) {
        console.log(`  Supports: ${model.supportedGenerationMethods.join(', ')}`);
      }
    });
    
    // Test models to try
    const modelsToTest = [
      'gemini-2.0-flash-exp',
      'gemini-2.5-flash', 
      'gemini-1.5-pro',
      'gemini-pro',
      'gemini-pro-vision'
    ];
    
    console.log('\n🧪 Testing models...');
    
    for (const modelName of modelsToTest) {
      try {
        console.log(`\n🔬 Testing: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const result = await model.generateContent('Hello, can you say "Test successful" in Urdu?');
        const response = await result.response;
        const text = response.text();
        
        console.log(`✅ ${modelName} works!`);
        console.log(`Response: ${text}`);
        break; // Found working model
        
      } catch (error) {
        console.log(`❌ ${modelName} failed: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ General error:', error);
  }
}

testGeminiAPI();