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
    
    // Test models to try
    const modelsToTest = [
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash', 
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
        
        // Test if it supports multimodal (audio/image)
        console.log(`🎵 Testing multimodal support for ${modelName}...`);
        try {
          const multiResult = await model.generateContent([
            { text: 'What can you tell me about audio analysis?' }
          ]);
          console.log(`✅ ${modelName} supports multimodal requests`);
        } catch (multiError) {
          console.log(`⚠️ ${modelName} multimodal test: ${multiError.message}`);
        }
        
        return modelName; // Return the working model name
        
      } catch (error) {
        console.log(`❌ ${modelName} failed: ${error.message}`);
      }
    }
    
    console.log('\n❌ No working models found');
    
  } catch (error) {
    console.error('❌ General error:', error);
  }
}

testGeminiAPI().then((workingModel) => {
  if (workingModel) {
    console.log(`\n🎉 Use this model in your app: "${workingModel}"`);
  }
});