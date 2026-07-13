chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translate") {
    const targetLang = request.targetLang || "en";
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(request.text)}`;
    
    fetch(url)
      .then(response => response.json())
      .then(data => {
        if (data && data[0]) {
          // Parse and combine multi-sentence translations
          const translatedText = data[0].map(item => item[0]).join('');
          sendResponse({ success: true, text: translatedText });
        } else {
          sendResponse({ success: false, error: "Invalid response format" });
        }
      })
      .catch(err => {
        sendResponse({ success: false, error: err.toString() });
      });
    
    return true; // Keeps the message channel open for the async fetch call
  }
});
