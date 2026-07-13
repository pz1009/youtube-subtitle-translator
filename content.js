// --- CONFIGURATION ---
// Change this to your preferred language code. 
// Examples: 'es' (Spanish), 'fr' (French), 'hi' (Hindi), 'de' (German), 'ar' (Arabic)
const TARGET_LANGUAGE = 'es'; 
// ---------------------

const translationCache = new Map();

async function translateText(text) {
  if (translationCache.has(text)) {
    return translationCache.get(text);
  }

  return new Promise((resolve) => {
    browser.runtime.sendMessage({
      action: "translate",
      text: text,
      targetLang: TARGET_LANGUAGE
    }, (response) => {
      if (response && response.translatedText) {
        translationCache.set(text, response.translatedText);
        resolve(response.translatedText);
      } else {
        resolve(null);
      }
    });
  });
}

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const segments = node.querySelectorAll('.ytp-caption-segment');
        segments.forEach(async (segment) => {
          if (segment.hasAttribute('data-translated-by-addon')) return;

          const originalText = segment.textContent.trim();
          if (!originalText) return;

          // Mark as processing to prevent loops
          segment.setAttribute('data-translated-by-addon', 'processing');

          const translatedText = await translateText(originalText);
          if (translatedText) {
            // Displays both original text and the translated text in bold yellow
            segment.innerHTML = `
              <div style="margin-bottom: 4px;">${originalText}</div>
              <div style="color: #ffeb3b; font-weight: bold; font-size: 1.1em; text-shadow: 2px 2px 2px #000;">
                ${translatedText}
              </div>
            `;
            segment.setAttribute('data-translated-by-addon', 'true');
          } else {
            segment.removeAttribute('data-translated-by-addon');
          }
        });
      }
    }
  }
});

function startObserving() {
  const captionContainer = document.querySelector('.ytp-caption-window-container');
  if (captionContainer) {
    observer.observe(captionContainer, { childList: true, subtree: true });
    console.log("Firefox YouTube Translator extension is active.");
  } else {
    // Retry if the video player container hasn't loaded yet
    setTimeout(startObserving, 1000);
  }
}

startObserving();
