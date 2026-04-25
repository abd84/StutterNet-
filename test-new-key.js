import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const API_KEY = process.env.VITE_GEMINI_API_KEY;

async function testGeminiAPI() {
  console.log('🚀 Testing Gemini API with new key...');
  
  if (!API_KEY || API_KEY === 'your-gemini-api-key-here') {
    console.error('❌ API key not found. Check your .env.local file');
    return;
  }
  
  console.log('✅ API key found:', API_KEY.substring(0, 20) + '...');
  
  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    // Extended list of models to test
    const modelsToTest = [
      'models/gemini-1.5-flash',
      'models/gemini-1.5-pro', 
      'models/gemini-pro',
      'models/gemini-pro-vision',
      'gemini-1.5-flash',
      'gemini-1.5-pro', 
      'gemini-pro',
      'gemini-pro-vision',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro-latest'
    ];
    
    console.log('\n🧪 Testing models...');
    let workingModel = null;
    
    for (const modelName of modelsToTest) {
      try {
        console.log(`\n🔬 Testing: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const result = await model.generateContent('Say "Hello" in Urdu');
        const response = await result.response;
        const text = response.text();
        
        console.log(`✅ ${modelName} works!`);
        console.log(`Response: ${text}`);
        
        workingModel = modelName;
        
        // Test if it supports multimodal (for audio)
        console.log(`🎵 Testing multimodal support...`);
        try {
          const multiResult = await model.generateContent([
            { text: 'Can you analyze audio files?' }
          ]);
          const multiText = multiResult.response.text();
          console.log(`✅ Multimodal support: ${multiText.substring(0, 100)}...`);
        } catch (multiError) {
          console.log(`⚠️ Multimodal test: ${multiError.message}`);
        }
        
        break; // Found working model
        
      } catch (error) {
        console.log(`❌ ${modelName} failed: ${error.message}`);
      }
    }
    
    if (workingModel) {
      console.log(`\n🎉 SUCCESS! Use this model: "${workingModel}"`);
      return workingModel;
    } else {
      console.log(`\n❌ No working models found with this API key`);
      console.log(`💡 Try regenerating your API key or check permissions at:`);
      console.log(`   https://makersuite.google.com/app/apikey`);
    }
    
  } catch (error) {
    console.error('❌ General error:', error);
  }
}

testGeminiAPI();