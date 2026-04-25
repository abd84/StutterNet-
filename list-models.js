import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const API_KEY = process.env.VITE_GEMINI_API_KEY;

async function listAvailableModels() {
  console.log('🔍 Listing available Gemini models...');
  
  if (!API_KEY || API_KEY === 'your-gemini-api-key-here') {
    console.error('❌ API key not found. Check your .env.local file');
    return;
  }
  
  console.log('✅ API key found:', API_KEY.substring(0, 20) + '...');
  
  try {
    // Try direct API call to list models
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('\n📋 Available models:');
    if (data.models && data.models.length > 0) {
      data.models.forEach((model, index) => {
        console.log(`${index + 1}. ${model.name}`);
        if (model.displayName) console.log(`   Display Name: ${model.displayName}`);
        if (model.description) console.log(`   Description: ${model.description}`);
        if (model.supportedGenerationMethods) {
          console.log(`   Supports: ${model.supportedGenerationMethods.join(', ')}`);
        }
        if (model.inputTokenLimit) console.log(`   Input Token Limit: ${model.inputTokenLimit}`);
        if (model.outputTokenLimit) console.log(`   Output Token Limit: ${model.outputTokenLimit}`);
        console.log('');
      });
      
      // Test the first available model
      if (data.models.length > 0) {
        const firstModel = data.models[0];
        console.log(`🧪 Testing first available model: ${firstModel.name}`);
        
        try {
          const genAI = new GoogleGenerativeAI(API_KEY);
          const model = genAI.getGenerativeModel({ model: firstModel.name.replace('models/', '') });
          
          const result = await model.generateContent('Say hello in Urdu');
          const response = await result.response;
          const text = response.text();
          
          console.log(`✅ ${firstModel.name} works!`);
          console.log(`Response: ${text}`);
          
          return firstModel.name.replace('models/', '');
          
        } catch (testError) {
          console.log(`❌ ${firstModel.name} test failed: ${testError.message}`);
        }
      }
    } else {
      console.log('❌ No models found in response');
      console.log('Response:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error listing models:', error.message);
    
    // Try alternative approach with GoogleGenerativeAI client
    console.log('\n🔄 Trying alternative approach...');
    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      
      // Try some common model names
      const commonModels = [
        'gemini-1.5-flash-8b',
        'gemini-1.5-flash',
        'gemini-1.0-pro',
        'text-bison-001',
        'chat-bison-001'
      ];
      
      for (const modelName of commonModels) {
        try {
          console.log(`\n🔬 Testing: ${modelName}`);
          const model = genAI.getGenerativeModel({ model: modelName });
          
          const result = await model.generateContent('Hello');
          const response = await result.response;
          const text = response.text();
          
          console.log(`✅ ${modelName} works!`);
          console.log(`Response: ${text}`);
          return modelName;
          
        } catch (testError) {
          console.log(`❌ ${modelName} failed: ${testError.message}`);
        }
      }
      
    } catch (altError) {
      console.error('❌ Alternative approach failed:', altError.message);
    }
  }
}

listAvailableModels();