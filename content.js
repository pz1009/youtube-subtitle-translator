// --- CONFIGURATION ---
// Change "en" to your preferred language code (e.g., "es" for Spanish, "fr" for French, "hi" for Hindi)
const TARGET_LANG = "en"; 


// 1. Inject styling for the custom overlay subtitles on standard videos
const style = document.createElement('style');
style.textContent = `
  .universal-translator-overlay {
    position: absolute;
    bottom: 12%;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(0, 0, 0, 0.75);
    color: #ffffff;
    padding: 8px 16px;
    border-radius: 6px;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 18px;
    font-weight: bold;
    text-align: center;
    z-index: 2147483647; /* Ensure it floats on top of full-screen video */
    pointer-events: none; /* Ignore mouse clicks */
    max-width: 85%;
    line-height: 1.5;
    white-space: pre-line;
    box-shadow: 0px 4px 10px rgba(0,0,0,0.5);
    display: none;
  }
`;
document.head.appendChild(style);


// --- SYSTEM 1: YOUTUBE TRANSLATOR ---
// YouTube updates captions dynamically. We observe updates and add translations below the original text.
const ytObserver = new MutationObserver(() => {
  const segments = document.querySelectorAll('.ytp-caption-segment');
  segments.forEach(segment => {
    const originalText = segment.textContent.trim();
    if (!originalText) return;
    
    // Prevent loops and double-translation
    if (segment.dataset.translated === originalText || segment.dataset.translating === "true") {
      return;
    }
    
    segment.dataset.translating = "true";
    
    chrome.runtime.sendMessage({ action: "translate", text: originalText, targetLang: TARGET_LANG }, (response) => {
      segment.dataset.translating = "false";
      if (response && response.success) {
        segment.dataset.translated = originalText;
        // Displays original subtitle with the translation in parentheses beneath it
        segment.textContent = `${originalText}\n(${response.text})`;
      }
    });
  });
});

// Start checking for YouTube subtitles
ytObserver.observe(document.body, { childList: true, subtree: true });


// --- SYSTEM 2: STANDARD HTML5 VIDEO TRANSLATOR ---
// Keeps track of processed standard videos
const activeVideos = new Set();

function scanForVideos() {
  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    if (activeVideos.has(video)) return;
    activeVideos.add(video);
    setupVideoTracks(video);
  });
}

function setupVideoTracks(video) {
  if (!video.textTracks) return;
  
  const handleCueChange = (track) => {
    track.mode = 'hidden'; // Hide browser's standard plain subtitles
    
    const activeCues = track.activeCues;
    if (activeCues && activeCues.length > 0) {
      const originalText = activeCues[0].text;
      
      chrome.runtime.sendMessage({ action: "translate", text: originalText, targetLang: TARGET_LANG }, (response) => {
        if (response && response.success) {
          displayOverlay(video, originalText, response.text);
        }
      });
    } else {
      removeOverlay(video);
    }
  };
  
  // Apply to existing tracks on the video element
  for (let i = 0; i < video.textTracks.length; i++) {
    const track = video.textTracks[i];
    track.addEventListener('cuechange', () => handleCueChange(track));
  }
  
  // Apply to future tracks that load dynamically
  video.textTracks.addEventListener('addtrack', (e) => {
    const track = e.track;
    track.addEventListener('cuechange', () => handleCueChange(track));
  });
}

function displayOverlay(video, originalText, translatedText) {
  const container = video.parentElement;
  if (!container) return;
  
  // Ensure the parent container can hold absolute-positioned children properly
  const containerStyle = window.getComputedStyle(container);
  if (containerStyle.position === 'static') {
    container.style.position = 'relative';
  }
  
  let overlay = container.querySelector('.universal-translator-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'universal-translator-overlay';
    container.appendChild(overlay);
  }
  
  overlay.textContent = `${originalText}\n(${translatedText})`;
  overlay.style.display = 'block';
}

function removeOverlay(video) {
  const container = video.parentElement;
  if (!container) return;
  const overlay = container.querySelector('.universal-translator-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

// Periodically scan the web page for new video elements
setInterval(scanForVideos, 2000);
