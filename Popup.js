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
// Add this right after your existing convertText function
const styles = [
  { id: "bold", name: "Bold", map: window.UnicodeStyler.styleMaps.bold },
  { id: "italic", name: "Italic", map: window.UnicodeStyler.styleMaps.italic },
  { id: "script", name: "Script", map: window.UnicodeStyler.styleMaps.script },
  {
    id: "monospace",
    name: "Monospace",
    map: window.UnicodeStyler.styleMaps.monospace,
  },
  {
    id: "fraktur",
    name: "Fraktur",
    map: window.UnicodeStyler.styleMaps.fraktur,
  },
  {
    id: "doubleStruck",
    name: "Double Struck",
    map: window.UnicodeStyler.styleMaps.doubleStruck,
  },
];

// State management
let suggestionState = {
  show: false,
  text: "",
  position: null,
  element: null,
  timer: null,
};

// Create and show suggestion UI
function showSuggestion(element, text) {
  const suggestionElement = document.getElementById("unicode-suggestion");
  const optionsContainer = suggestionElement.querySelector(
    ".suggestion-options"
  );

  // Clear previous options
  optionsContainer.innerHTML = "";

  // Update the suggestion state
  suggestionState.show = true;
  suggestionState.text = text;
  suggestionState.element = element;

  // Calculate position
  const rect = element.getBoundingClientRect();
  suggestionElement.style.left = `${rect.right + 10}px`;
  suggestionElement.style.top = `${rect.top}px`;

  // Create style options
  styles.forEach((style) => {
    const option = document.createElement("div");
    option.className =
      "suggestion-option p-2 rounded cursor-pointer hover:bg-zinc-700 transition-colors";
    option.innerHTML = `
      <div class="text-sm font-medium text-green-400 mb-1">${style.name}</div>
      <div class="text-xs font-mono">${text.substring(0, 25)}${
      text.length > 25 ? "..." : ""
    } → ${convertText(text.substring(0, 25), style.id)}${
      text.length > 25 ? "..." : ""
    }</div>
    `;

    option.addEventListener("click", () => {
      applyStyle(style.id, text);
    });

    optionsContainer.appendChild(option);
  });

  // Show the UI
  suggestionElement.classList.remove("hidden");

  // Auto-hide after 8 seconds
  clearTimeout(suggestionState.timer);
  suggestionState.timer = setTimeout(() => {
    hideSuggestion();
  }, 8000);
}

function hideSuggestion() {
  const suggestionElement = document.getElementById("unicode-suggestion");
  if (suggestionElement) {
    suggestionElement.classList.add("hidden");
    suggestionElement
      .querySelector(".suggestion-popup")
      .classList.add("hidden");
  }
  suggestionState.show = false;
}

// Apply the selected style
function applyStyle(styleId, text) {
  if (!suggestionState.element) return;

  const convertedText = convertText(text, styleId);

  if (
    suggestionState.element instanceof HTMLInputElement ||
    suggestionState.element instanceof HTMLTextAreaElement
  ) {
    suggestionState.element.value = convertedText;
    const event = new Event("input", { bubbles: true });
    suggestionState.element.dispatchEvent(event);
  } else if (
    suggestionState.element.getAttribute("contenteditable") === "true"
  ) {
    suggestionState.element.textContent = convertedText;
    const event = new Event("input", { bubbles: true });
    suggestionState.element.dispatchEvent(event);
  }

  hideSuggestion();
}

// Set up global input listeners
function setupGlobalListeners() {
  const minLength = 3;
  const delay = 1500;

  document.addEventListener("input", (event) => {
    const element = event.target;

    if (
      (element instanceof HTMLInputElement &&
        (element.type === "text" || element.type === "search")) ||
      element instanceof HTMLTextAreaElement ||
      (element instanceof HTMLElement &&
        element.getAttribute("contenteditable") === "true")
    ) {
      const text = element.value || element.textContent || "";

      if (text && text.length >= minLength && !suggestionState.show) {
        clearTimeout(suggestionState.timer);
        suggestionState.timer = setTimeout(() => {
          showSuggestion(element, text);
        }, delay);
      }
    }
  });

  // Setup trigger button click handler
  const triggerBtn = document.querySelector(".suggestion-trigger");
  const popupContent = document.querySelector(".suggestion-popup");

  triggerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    popupContent.classList.toggle("hidden");
  });

  // Close when clicking outside
  document.addEventListener("click", (event) => {
    const suggestionElement = document.getElementById("unicode-suggestion");
    if (suggestionElement && !suggestionElement.contains(event.target)) {
      popupContent.classList.add("hidden");
    }
  });
}

// Initialize the feature
function initUnicodeSuggestion() {
  setupGlobalListeners();
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
document.getElementById("sticky-copy").addEventListener("click", async () => {
  const editor = document.getElementById("editor");
  if (!editor.innerText.trim()) return;

  try {
    await navigator.clipboard.writeText(editor.innerText);
    showTooltip("sticky-copy", "Copied!");
  } catch (err) {
    showTooltip("sticky-copy", "Failed!");
    console.error("Copy failed:", err);
  }
});

// Save functionality (using localStorage)
document.getElementById("sticky-save").addEventListener("click", () => {
  const editor = document.getElementById("editor");
  const content = editor.innerText.trim();
  if (!content) return;

  try {
    // Generate timestamp for unique key
    const timestamp = new Date().toISOString();
    const saveKey = `vibe-doc-${timestamp}`;

    // Save to localStorage
    localStorage.setItem(saveKey, content);

    // Initialize savedDocs as empty array if null/undefined
    const savedDocs = JSON.parse(
      localStorage.getItem("vibe-documents") || "[]"
    );

    // Add new document to the array
    savedDocs.push({
      id: saveKey,
      content,
      timestamp,
    });

    // Save back to localStorage
    localStorage.setItem("vibe-documents", JSON.stringify(savedDocs));

    showTooltip("sticky-save", "Saved!");
  } catch (err) {
    console.error("Save failed:", err);
    showTooltip("sticky-save", "Failed!");
  }
});
// Show tooltip feedback
function showTooltip(elementId, message) {
  const btn = document.getElementById(elementId);
  const tooltip = document.createElement("div");
  tooltip.className = `absolute left-0 -translate-x-full px-2 py-1 bg-${
    elementId === "sticky-copy" ? "[#92278f]" : "blue-500"
  } text-white rounded-md text-xs whitespace-nowrap`;
  tooltip.textContent = message;
  btn.appendChild(tooltip);

  setTimeout(() => {
    tooltip.classList.add("opacity-0", "transition-opacity", "duration-300");
    setTimeout(() => tooltip.remove(), 300);
  }, 1500);
}

// Load last saved content (optional)
window.addEventListener("DOMContentLoaded", () => {
  const savedDocs = JSON.parse(localStorage.getItem("vibe-documents"));
  if (savedDocs?.length) {
    const editor = document.getElementById("editor");
    editor.textContent = savedDocs[savedDocs.length - 1].content;
  }
});

/**
 * Initializes the editor functionality
 */
function initEditor() {
  // Toolbar event delegation
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

  //Copy button
  document.getElementById("copy-button").addEventListener("click", handleCopy);

  //Editor setup
  const editor = document.getElementById("editor");

  // Focus editor on load
  editor.focus();

  // Handle placeholder
  editor.addEventListener("input", () => {
    editor.toggleAttribute("data-empty", !editor.textContent.trim());
  });
  initUnicodeSuggestion();
}

// Initialize when DOM is fully loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initEditor);
} else {
  initEditor(); 
}
