export function parseRTFTranscription(rtfContent: string): string {
  // Remove RTF header and formatting codes
  let cleanContent = rtfContent
    // Remove RTF document structure
    .replace(/^{\rtf1.*?}$/gs, (match) => {
      // Extract the main text content from RTF
      const textStart = match.indexOf('\\f0');
      if (textStart === -1) return '';
      
      let content = match.substring(textStart);
      
      // Remove font formatting codes
      content = content
        .replace(/\\f[0-9]+/g, '') // Remove font changes
        .replace(/\\fs[0-9]+/g, '') // Remove font sizes
        .replace(/\\cf[0-9]+/g, '') // Remove color formatting
        .replace(/\\cb[0-9]+/g, '') // Remove background colors
        .replace(/\\[a-z]+[0-9]*\s?/g, '') // Remove other RTF commands
        .replace(/[{}]/g, '') // Remove braces
        .trim();
      
      return content;
    });

  // Decode Unicode escape sequences (\u1234 format)
  cleanContent = cleanContent.replace(/\\u([0-9]+)\s?/g, (match, code) => {
    return String.fromCharCode(parseInt(code));
  });
  
  // Decode hex escape sequences (\'XX format)
  cleanContent = cleanContent.replace(/\\'([0-9a-fA-F]{2})/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  // Clean up extra whitespace and formatting
  cleanContent = cleanContent
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\[\/?[^\]]*\]/g, '') // Remove annotation brackets like [لکنت] [/لکنت]
    .trim();
  
  return cleanContent;
}

// Real transcriptions extracted from RTF files
export const realTranscriptions = {
  "T10-Sy": "میں اس فروخت کو [بلاک] [/بلاک] آئل میں تک ہر حال میں مکمل کرنا ہے۔ ورنہ بہت مسئلہ ہو گا۔",
  "T20-p": "میں وہ [لکنت] ابھی ابھی [/لکنت] جانا ہوگا۔ اس سے فرق کہ بہت دیر ہو جائے",
  "T30-w": "ہمیں وہاں [لکنت] ابھی ابھی [/لکنت] جانا ہوگا، اس سے پہلے کہ بہت دیر ہو جائے",
  "T61-w": "[لکنت] شاید شاید [/لکنت] وہ ہماری بات نہیں سمجھ آ سی لیے خاموش تھا۔",
  "T41-Sy": "مجھے [حرف] ز... [/حرف] زانی چاہیے۔"
};