// =============================================
// popup.js - Unicode Text Styler Core Logic
// Uses window.UnicodeStyler namespace
// =============================================

/**
 * Converts text to styled Unicode characters
 * @param {string} text - Input text to convert
 * @param {string} style - Style key (bold/italic/script/monospace)
 * @returns {string} Styled text
 */
function convertText(text, style) {
  // Fail-safe if unicode.js isn't loaded
  if (!window.UnicodeStyler || !window.UnicodeStyler.styleMaps) {
    console.error("Unicode maps not loaded!");
    return text;
  }

  const { styleMaps } = window.UnicodeStyler;
  if (!text || !styleMaps[style]) return text;

  return text
    .split("")
    .map((char) => {
      // 1. Try exact character match
      if (styleMaps[style][char]) return styleMaps[style][char];

      // 2. Try opposite case
      const oppositeCase =
        char === char.toLowerCase() ? char.toUpperCase() : char.toLowerCase();

      return styleMaps[style][oppositeCase] || char;
    })
    .join("");
}

/**
 * Applies style to selected text or inserts sample
 * @param {string} style - Style key to apply
 */
function applyStyle(style) {
  // Fail-safe check
  if (!window.UnicodeStyler) {
    console.error("UnicodeStyler not loaded");
    return;
  }

  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const selectedText = selection.toString();

  if (selectedText) {
    // Apply style to selection
    const styledText = convertText(selectedText, style);
    range.deleteContents();
    range.insertNode(document.createTextNode(styledText));
  } else {
    // Insert sample text at cursor
    const sample = window.UnicodeStyler.sampleText[style] || "";
    range.insertNode(document.createTextNode(sample));
  }
}

 // Clipboard functionality
    document.getElementById('sticky-copy').addEventListener('click', async () => {
      const editor = document.getElementById('editor');
      if (!editor.innerText.trim()) return;
      
      try {
        await navigator.clipboard.writeText(editor.innerText);
        showTooltip('sticky-copy', 'Copied!');
      } catch (err) {
        showTooltip('sticky-copy', 'Failed!');
        console.error('Copy failed:', err);
      }
    });

    // Save functionality (using localStorage)
    document.getElementById('sticky-save').addEventListener('click', () => {
      const editor = document.getElementById('editor');
      const content = editor.innerText.trim();
      if (!content) return;
      
      try {
        // Generate timestamp for unique key
        const timestamp = new Date().toISOString();
        const saveKey = `vibe-doc-${timestamp}`;
        
        // Save to localStorage
        localStorage.setItem(saveKey, content);
        showTooltip('sticky-save', 'Saved!');
        
        // Optional: Add to saved documents list
        const savedDocs = JSON.parse(localStorage.getItem('vibe-documents') || []);
        savedDocs.push({
          id: saveKey,
          content,
          timestamp
        });
        localStorage.setItem('vibe-documents', JSON.stringify(savedDocs));
      } catch (err) {
        showTooltip('sticky-save', 'Failed!');
        console.error('Save failed:', err);
      }
    });

    // Show tooltip feedback
    function showTooltip(elementId, message) {
      const btn = document.getElementById(elementId);
      const tooltip = document.createElement('div');
      tooltip.className = `absolute left-0 -translate-x-full px-2 py-1 bg-${elementId === 'sticky-copy' ? '[#92278f]' : 'blue-500'} text-white rounded-md text-xs whitespace-nowrap`;
      tooltip.textContent = message;
      btn.appendChild(tooltip);
      
      setTimeout(() => {
        tooltip.classList.add('opacity-0', 'transition-opacity', 'duration-300');
        setTimeout(() => tooltip.remove(), 300);
      }, 1500);
    }

    // Load last saved content (optional)
    window.addEventListener('DOMContentLoaded', () => {
      const savedDocs = JSON.parse(localStorage.getItem('vibe-documents'));
      if (savedDocs?.length) {
        const editor = document.getElementById('editor');
        editor.textContent = savedDocs[savedDocs.length - 1].content;
      }
    });

/**
 * Initializes the editor functionality
 */
function initEditor() {
  // 1. Toolbar event delegation
  document.querySelector(".toolbar").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cmd]");
    if (btn) {
      // Visual feedback
      btn.classList.add("ring-2", "ring-[#92278f]");
      setTimeout(() => btn.classList.remove("ring-2", "ring-[#92278f]"), 200);

      // Apply style
      applyStyle(btn.dataset.cmd);
    }
  });

  // 2. Copy button
  document.getElementById("copy-button").addEventListener("click", handleCopy);

  // 3. Editor setup
  const editor = document.getElementById("editor");

  // Focus editor on load
  editor.focus();

  // Handle placeholder
  editor.addEventListener("input", () => {
    editor.toggleAttribute("data-empty", !editor.textContent.trim());
  });
}

// Initialize when DOM is fully loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initEditor);
} else {
  initEditor(); // Already loaded
}
