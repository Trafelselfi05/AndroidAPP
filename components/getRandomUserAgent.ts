export const getRandomUserAgent = (): string => {
  const userAgents = [
    // Varian iOS (iPhone)
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MargeStoreMobileApp/1.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 MargeStoreMobileApp/1.0",
    
    // Varian Android (Samsung, Pixel, Xiaomi)
    "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36 MargeStoreMobileApp/1.0",
    "Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36 MargeStoreMobileApp/1.0",
    "Mozilla/5.0 (Linux; Android 12; M2101K6G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36 MargeStoreMobileApp/1.0",
    
    // Varian Standar Expo/React Native Runtime
    "ExpoRuntime/2.30.0 (Android; U; id-ID) MargeStoreMobileApp/1.0",
    "MargeStoreMobileApp/1.0 (React Native; Android)"
  ];

  // Mengambil satu item secara acak dari array
  const randomIndex = Math.floor(Math.random() * userAgents.length);
  return userAgents[randomIndex];
};