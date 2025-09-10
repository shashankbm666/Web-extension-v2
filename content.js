class FocusHelper {
  constructor() {
    this.lineGuide = null;
    this.magnifier = null;
    this.magnifierCanvas = null;
    this.isTextToSpeechEnabled = false;
    this.magnifierZoom = 'off';
    this.animationFrame = null;
    this.init();
  }

  async init() {
    // Load initial settings
    const result = await chrome.storage.sync.get([
      'font', 'boldStyle', 'background', 'lineGuide', 'textToSpeech', 'hideDistraction', 'magnifierZoom'
    ]);
    
    this.applyAllSettings(result);
    this.setupEventListeners();
    
    // Listen for updates from popup
    window.addEventListener('message', (event) => {
      if (event.data.type === 'FOCUS_HELPER_UPDATE') {
        this.applyAllSettings(event.data.settings);
      }
    });
  }

  applyAllSettings(settings) {
    this.applyFont(settings.font || 'default');
    this.applyBoldStyle(settings.boldStyle || 'none');
    this.applyBackground(settings.background || 'default');
    this.toggleLineGuide(settings.lineGuide || false);
    this.toggleTextToSpeech(settings.textToSpeech || false);
    this.toggleDistractionBlocking(settings.hideDistraction || false);
    this.toggleMagnifier(settings.magnifierZoom || 'off');
  }

  applyFont(font) {
    const fontUrls = {
      opendyslexic: 'https://fonts.googleapis.com/css2?family=OpenDyslexic',
      dyslexie: 'https://fonts.googleapis.com/css2?family=Dyslexie'
    };

    const existingLink = document.getElementById('focus-helper-font');
    if (existingLink) existingLink.remove();

    if (fontUrls[font]) {
      const link = document.createElement('link');
      link.id = 'focus-helper-font';
      link.rel = 'stylesheet';
      link.href = fontUrls[font];
      document.head.appendChild(link);
    }

    const fontFamily = {
      default: '',
      opendyslexic: 'OpenDyslexic, Arial, sans-serif',
      dyslexie: 'Dyslexie, Arial, sans-serif',
      arial: 'Arial, sans-serif',
      verdana: 'Verdana, sans-serif'
    };

    if (font !== 'default') {
      document.body.style.fontFamily = fontFamily[font];
      document.querySelectorAll('*').forEach(el => {
        if (!el.id || !el.id.includes('focus-helper')) {
          el.style.fontFamily = fontFamily[font];
        }
      });
    }
  }

  applyBoldStyle(style) {
    document.querySelectorAll('.focus-helper-bold').forEach(el => {
      el.classList.remove('focus-helper-bold');
      el.style.fontWeight = '';
      el.style.textShadow = '';
    });

    if (style === 'none') return;

    const textNodes = this.getAllTextNodes();
    textNodes.forEach(node => {
      const parent = node.parentElement;
      if (!parent || parent.id?.includes('focus-helper')) return;

      switch (style) {
        case 'half':
          this.applyHalfBold(node);
          break;
        case 'full':
          parent.style.fontWeight = 'bold';
          parent.classList.add('focus-helper-bold');
          break;
        case 'outline':
          parent.style.textShadow = '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000';
          parent.classList.add('focus-helper-bold');
          break;
      }
    });
  }

  applyHalfBold(textNode) {
    const text = textNode.textContent;
    const words = text.split(' ');
    const newHTML = words.map(word => {
      if (word.length <= 1) return word;
      const midPoint = Math.ceil(word.length / 2);
      const firstHalf = word.substring(0, midPoint);
      const secondHalf = word.substring(midPoint);
      return `<span style="font-weight: bold;">${firstHalf}</span>${secondHalf}`;
    }).join(' ');

    const span = document.createElement('span');
    span.innerHTML = newHTML;
    span.classList.add('focus-helper-bold');
    textNode.parentElement.replaceChild(span, textNode);
  }

  applyBackground(bgType) {
    const backgrounds = {
      default: '',
      cream: '#fefcf3',
      'light-blue': '#f0f8ff',
      'light-green': '#f0fff0',
      dark: '#2c3e50'
    };

    document.body.style.backgroundColor = backgrounds[bgType];
    
    if (bgType === 'dark') {
      document.body.style.color = '#ecf0f1';
    } else if (bgType !== 'default') {
      document.body.style.color = '#2c3e50';
    }
  }

  toggleLineGuide(enabled) {
    if (this.lineGuide) {
      this.lineGuide.remove();
      this.lineGuide = null;
    }

    if (enabled) {
      this.lineGuide = document.createElement('div');
      this.lineGuide.id = 'focus-helper-line-guide';
      this.lineGuide.style.cssText = `
        position: fixed;
        left: 0;
        right: 0;
        height: 3px;
        background: rgba(52, 152, 219, 0.7);
        pointer-events: none;
        z-index: 10000;
        transition: top 0.1s ease;
        display: none;
      `;
      document.body.appendChild(this.lineGuide);
    }
  }

  updateLineGuide(e) {
    if (this.lineGuide) {
      this.lineGuide.style.top = (e.clientY - 1) + 'px';
      this.lineGuide.style.display = 'block';
    }
  }

  toggleTextToSpeech(enabled) {
    this.isTextToSpeechEnabled = enabled;
  }

  handleTextSelection() {
    if (!this.isTextToSpeechEnabled) return;
    
    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(selectedText);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
  }

  toggleDistractionBlocking(enabled) {
    const style = document.getElementById('focus-helper-distraction-block');
    
    if (style) {
      style.remove();
    }

    if (enabled) {
      const styleEl = document.createElement('style');
      styleEl.id = 'focus-helper-distraction-block';
      styleEl.textContent = `
        img:not(#focus-helper-magnifier *), 
        video:not(#focus-helper-magnifier *), 
        iframe, embed, object { 
          display: none !important; 
        }
        *[style*="animation"]:not([id*="focus-helper"]), 
        *[class*="animate"]:not([id*="focus-helper"]) { 
          animation: none !important; 
        }
        video[autoplay] { 
          autoplay: false !important; 
        }
        .gif, .animated { 
          animation-play-state: paused !important; 
        }
      `;
      document.head.appendChild(styleEl);

      document.querySelectorAll('video').forEach(video => {
        video.pause();
        video.muted = true;
      });
    }
  }

  toggleMagnifier(zoomLevel) {
    this.magnifierZoom = zoomLevel;
    
    if (this.magnifier) {
      this.magnifier.remove();
      this.magnifier = null;
      this.magnifierCanvas = null;
    }
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (zoomLevel === 'off') {
      document.removeEventListener('mousemove', this.updateMagnifierBound);
      return;
    }

    this.createMagnifier(parseInt(zoomLevel));
    this.updateMagnifierBound = this.updateMagnifier.bind(this);
    document.addEventListener('mousemove', this.updateMagnifierBound);
  }

  createMagnifier(zoomLevel) {
    this.magnifier = document.createElement('div');
    this.magnifier.id = 'focus-helper-magnifier';
    
    this.magnifier.style.cssText = `
      position: fixed;
      width: 200px;
      height: 150px;
      border: 3px solid #3498db;
      border-radius: 8px;
      background: white;
      pointer-events: none;
      z-index: 10001;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: none;
    `;

    this.magnifierCanvas = document.createElement('canvas');
    this.magnifierCanvas.width = 200;
    this.magnifierCanvas.height = 150;
    this.magnifierCanvas.style.cssText = `
      width: 100%;
      height: 100%;
      display: block;
    `;
    
    this.magnifier.appendChild(this.magnifierCanvas);
    document.body.appendChild(this.magnifier);
  }

  updateMagnifier(e) {
    if (!this.magnifier || this.magnifierZoom === 'off') return;

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    this.animationFrame = requestAnimationFrame(() => {
      this.renderMagnifier(e.clientX, e.clientY);
    });
  }

  renderMagnifier(mouseX, mouseY) {
    if (!this.magnifier || !this.magnifierCanvas) return;

    const zoom = parseInt(this.magnifierZoom);
    const magnifierRect = this.magnifier.getBoundingClientRect();
    
    let magnifierX = mouseX + 20;
    let magnifierY = mouseY - magnifierRect.height / 2;
    
    if (magnifierX + magnifierRect.width > window.innerWidth) {
      magnifierX = mouseX - magnifierRect.width - 20;
    }
    if (magnifierY < 0) magnifierY = 0;
    if (magnifierY + magnifierRect.height > window.innerHeight) {
      magnifierY = window.innerHeight - magnifierRect.height;
    }

    this.magnifier.style.left = magnifierX + 'px';
    this.magnifier.style.top = magnifierY + 'px';
    this.magnifier.style.display = 'block';

    this.renderContent(mouseX, mouseY, zoom);
  }

  renderContent(mouseX, mouseY, zoom) {
    const ctx = this.magnifierCanvas.getContext('2d');
    ctx.clearRect(0, 0, 200, 150);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 200, 150);

    const elementsAtPoint = document.elementsFromPoint(mouseX, mouseY);
    const targetElement = elementsAtPoint.find(el => 
      el !== this.magnifier && 
      !el.id?.includes('focus-helper') &&
      (el.tagName === 'IMG' || el.textContent?.trim())
    );

    if (targetElement) {
      if (targetElement.tagName === 'IMG') {
        this.renderImage(ctx, targetElement, zoom);
      } else {
        this.renderText(ctx, targetElement, zoom, mouseX, mouseY);
      }
    } else {
      ctx.fillStyle = '#666';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${zoom}x Magnifier`, 100, 75);
    }
  }

  renderImage(ctx, imgElement, zoom) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        let drawWidth = 200;
        let drawHeight = 150;
        
        if (aspectRatio > 200/150) {
          drawHeight = 200 / aspectRatio;
        } else {
          drawWidth = 150 * aspectRatio;
        }
        
        const x = (200 - drawWidth) / 2;
        const y = (150 - drawHeight) / 2;
        
        ctx.drawImage(img, x, y, drawWidth, drawHeight);
      };
      img.onerror = () => {
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Image Preview', 100, 75);
      };
      img.src = imgElement.src;
    } catch (error) {
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Image Preview', 100, 75);
    }
  }

  renderText(ctx, element, zoom, mouseX, mouseY) {
    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);
    
    const fontSize = Math.min(parseInt(computedStyle.fontSize) * zoom / 3, 24);
    ctx.font = `${fontSize}px ${computedStyle.fontFamily || 'Arial'}`;
    ctx.fillStyle = computedStyle.color || '#333';
    ctx.textBaseline = 'top';
    
    const text = element.textContent || element.innerText || '';
    if (!text.trim()) return;
    
    const words = text.trim().split(/\s+/).slice(0, 20);
    let line = '';
    let y = 15;
    const lineHeight = fontSize * 1.3;
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > 180 && i > 0) {
        ctx.fillText(line.trim(), 10, y);
        line = words[i] + ' ';
        y += lineHeight;
        
        if (y > 120) break;
      } else {
        line = testLine;
      }
    }
    if (line.trim()) {
      ctx.fillText(line.trim(), 10, y);
    }
  }

  getAllTextNodes() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          if (node.parentElement?.id?.includes('focus-helper')) {
            return NodeFilter.FILTER_REJECT;
          }
          return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      },
      false
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    return textNodes;
  }

  setupEventListeners() {
    document.addEventListener('mousemove', (e) => {
      if (this.lineGuide) {
        this.updateLineGuide(e);
      }
    });

    document.addEventListener('mouseup', () => {
      this.handleTextSelection();
    });

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.altKey) {
        switch (e.key) {
          case 'l':
            this.toggleFeature('lineGuide');
            break;
          case 't':
            this.toggleFeature('textToSpeech');
            break;
          case 'm':
            this.toggleMagnifierShortcut();
            break;
        }
      }
    });
  }

  async toggleFeature(feature) {
    const result = await chrome.storage.sync.get([feature]);
    const newState = !result[feature];
    await chrome.storage.sync.set({ [feature]: newState });
    
    if (feature === 'lineGuide') {
      this.toggleLineGuide(newState);
    } else if (feature === 'textToSpeech') {
      this.toggleTextToSpeech(newState);
    }
  }

  async toggleMagnifierShortcut() {
    const result = await chrome.storage.sync.get(['magnifierZoom']);
    const currentZoom = result.magnifierZoom || 'off';
    const newZoom = currentZoom === 'off' ? '3' : 'off';
    await chrome.storage.sync.set({ magnifierZoom: newZoom });
    this.toggleMagnifier(newZoom);
  }
}

// Initialize FocusHelper when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new FocusHelper();
  });
} else {
  new FocusHelper();
}
