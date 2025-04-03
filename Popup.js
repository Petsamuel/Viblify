// =============================================
// popup.js - Unicode Text Styler Core Logic
// Now with Suggestion Feature
// =============================================

// Unicode styles configuration
const unicodeStyles = [
  { id: "bold", name: "Bold" },
  { id: "italic", name: "Italic" },
  { id: "script", name: "Script" },
  { id: "monospace", name: "Monospace" },
  { id: "fraktur", name: "Fraktur" },
  { id: "doubleStruck", name: "Double Struck" },
];

const MAX_HISTORY = 50;
let historyStack = [];
let futureStack = [];
let isApplyingStyle = false;

/**
 * Converts text to styled Unicode characters
 * @param {string} text - Input text to convert
 * @param {string} style - Style key (bold/italic/script/monospace)
 * @returns {string} Styled text
 */
function convertText(text, style) {
  // Fail-safe if unicode.js isn't loaded
  // if (!window.UnicodeStyler || !window.UnicodeStyler.styleMaps) {
  //   console.error("Unicode maps not loaded!");
  //   return text;
  // }

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
  saveState(); // Save state before applying style
  isApplyingStyle = true;
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const selectedText = selection.toString();

  if (selectedText) {
    // Apply style to selection
    const styledText = convertText(selectedText, style);
    range.deleteContents();
    range.insertNode(document.createTextNode(styledText));
  } 
  // else {
  //   // Insert sample text at cursor
  //   const sample = window.UnicodeStyler.sampleText[style] || "";
  //   range.insertNode(document.createTextNode(sample));
  // }
  isApplyingStyle = false;
  saveState(); // Save state after applying style
  updateUndoRedoButtons();
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
    const timestamp = new Date().toISOString();
    const saveKey = `vibe-doc-${timestamp}`;

    localStorage.setItem(saveKey, content);

    const savedDocs = JSON.parse(
      localStorage.getItem("vibe-documents") || "[]"
    );

    savedDocs.push({
      id: saveKey,
      content,
      timestamp,
    });

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

// Initialize undo/redo functionality
function initUndoRedo() {
  const editor = document.getElementById("editor");
  const undoBtn = document.getElementById("undo-btn");
  const redoBtn = document.getElementById("redo-btn");

  // Save initial state
  saveState();

  // Editor event listener for content changes
  editor.addEventListener("input", () => {
    if (!isApplyingStyle) {
      saveState();
    }
    updateUndoRedoButtons();
  });

  // Undo button click handler
  undoBtn.addEventListener("click", () => {
    if (historyStack.length > 1) {
      futureStack.push(historyStack.pop());
      restoreState(historyStack[historyStack.length - 1]);
      updateUndoRedoButtons();
    }
  });

  // Redo button click handler
  redoBtn.addEventListener("click", () => {
    if (futureStack.length > 0) {
      const state = futureStack.pop();
      historyStack.push(state);
      restoreState(state);
      updateUndoRedoButtons();
    }
  });

  // Update button states initially
  updateUndoRedoButtons();
}
function saveState() {
  const editor = document.getElementById("editor");
  const currentState = editor.innerHTML;

  // Don't save if same as last state
  if (
    historyStack.length > 0 &&
    historyStack[historyStack.length - 1] === currentState
  ) {
    return;
  }

  historyStack.push(currentState);
  futureStack = []; // Clear redo stack on new action

  // Limit history size
  if (historyStack.length > MAX_HISTORY) {
    historyStack.shift();
  }
}

function restoreState(state) {
  const editor = document.getElementById("editor");
  isApplyingStyle = true;
  editor.innerHTML = state;
  isApplyingStyle = false;
}

function updateUndoRedoButtons() {
  const undoBtn = document.getElementById("undo-btn");
  const redoBtn = document.getElementById("redo-btn");

  undoBtn.disabled = historyStack.length <= 1;
  redoBtn.disabled = futureStack.length === 0;
}

// Load last saved content
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
  initUndoRedo();
  // style selector
  document.getElementById("style-selector").addEventListener("change", (e) => {
    const style = e.target.value;
    if (style) {
      // Visual feedback
      e.target.classList.add("ring-1", "ring-green-400");
      setTimeout(() => {
        e.target.classList.remove("ring-1", "ring-green-400");
        e.target.value = ""; // Reset the select
      }, 200);

      applyStyle(style);
    }
  });

  // 2. Editor setup
  const editor = document.getElementById("editor");
  editor.focus();
  editor.addEventListener("input", () => {
    editor.toggleAttribute("data-empty", !editor.textContent.trim());
  });
}

// Initialize when DOM is fully loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initEditor);
} else {
  initEditor();
}
