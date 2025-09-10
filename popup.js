// Load saved settings
document.addEventListener('DOMContentLoaded', async () => {
  const result = await chrome.storage.sync.get([
    'font', 'boldStyle', 'background', 'lineGuide', 'textToSpeech', 'hideDistraction', 'magnifierZoom'
  ]);

  document.getElementById('fontSelect').value = result.font || 'default';
  document.getElementById('boldSelect').value = result.boldStyle || 'none';
  document.getElementById('bgSelect').value = result.background || 'default';
  document.getElementById('magnifierZoom').value = result.magnifierZoom || 'off';
  document.getElementById('lineGuide').checked = result.lineGuide || false;
  document.getElementById('textToSpeech').checked = result.textToSpeech || false;
  document.getElementById('hideDistraction').checked = result.hideDistraction || false;
});

// Save settings and update content script
async function updateSetting(key, value) {
  await chrome.storage.sync.set({ [key]: value });
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: applySettings,
    args: [{ [key]: value }]
  });
}

// Event listeners
document.getElementById('fontSelect').addEventListener('change', (e) => {
  updateSetting('font', e.target.value);
});

document.getElementById('boldSelect').addEventListener('change', (e) => {
  updateSetting('boldStyle', e.target.value);
});

document.getElementById('bgSelect').addEventListener('change', (e) => {
  updateSetting('background', e.target.value);
});

document.getElementById('magnifierZoom').addEventListener('change', (e) => {
  updateSetting('magnifierZoom', e.target.value);
});

document.getElementById('lineGuide').addEventListener('change', (e) => {
  updateSetting('lineGuide', e.target.checked);
});

document.getElementById('textToSpeech').addEventListener('change', (e) => {
  updateSetting('textToSpeech', e.target.checked);
});

document.getElementById('hideDistraction').addEventListener('change', (e) => {
  updateSetting('hideDistraction', e.target.checked);
});

// Function to be injected into content script
function applySettings(settings) {
  window.postMessage({ type: 'FOCUS_HELPER_UPDATE', settings }, '*');
}
