// Guard against running in popup context
if (document.getElementById("editor")) {
  console.log("content.js: Detected popup context, exiting");
  return;
}

function convertText(text, style) {
  const styleMap = window.UnicodeStyler.styleMaps[style];
  if (!styleMap) return text;

  return text
    .split("")
    .map((char) => {
      if (styleMap[char]) return styleMap[char];
      const oppositeCase =
        char === char.toLowerCase() ? char.toUpperCase() : char.toLowerCase();
      return styleMap[oppositeCase] || char;
    })
    .join("");
}

function applyStyle(input, style) {
  if (!input) {
    console.error("applyStyle: Input is undefined");
    return;
  }

  const isTwitterEditor =
    input.classList?.contains("public-DraftEditor-content") ||
    input.classList?.contains("notranslate") ||
    input.getAttribute("role") === "textbox" ||
    input.getAttribute("aria-label")?.toLowerCase().includes("tweet");

  if (isTwitterEditor) {
    const editableDiv = input.querySelector("[data-text='true']") || input;
    const sel = window.getSelection();

    if (sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (!range.collapsed) {
        const selectedText = range.toString();
        const convertedText = convertText(selectedText, style);
        range.deleteContents();
        range.insertNode(document.createTextNode(convertedText));
      } else {
        const allText = editableDiv.textContent || "";
        editableDiv.textContent = convertText(allText, style);
      }

      const event = new Event("input", { bubbles: true });
      input.dispatchEvent(event);

      sel.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(editableDiv);
      newRange.collapse(false);
      sel.addRange(newRange);
    }
  } else if (input.tagName === "INPUT" || input.tagName === "TEXTAREA") {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;

    if (start === end) {
      input.value = convertText(text, style);
    } else {
      const selectedText = text.substring(start, end);
      input.value =
        text.substring(0, start) +
        convertText(selectedText, style) +
        text.substring(end);
    }

    const event = new Event("input", { bubbles: true });
    input.dispatchEvent(event);
  } else if (input.getAttribute("contenteditable") === "true") {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (!range.collapsed) {
        const selectedText = range.toString();
        range.deleteContents();
        range.insertNode(
          document.createTextNode(convertText(selectedText, style))
        );
      } else {
        input.textContent = convertText(input.textContent, style);
      }
    }

    const event = new Event("input", { bubbles: true });
    input.dispatchEvent(event);
  }
}

function initUnicodeSuggestions() {
  const MIN_INPUT_HEIGHT = 20;
  const MIN_INPUT_WIDTH = 100;
  const IDLE_TIMEOUT = 5000;

  const STYLES = [
    { id: "bold", name: "Bold", char: "𝗕", cmd: "bold" },
    { id: "italic", name: "Italic", char: "𝘪", cmd: "italic" },
    { id: "script", name: "Script", char: "𝓢", cmd: "script" },
    { id: "monospace", name: "Monospace", char: "𝙼", cmd: "monospace" },
    { id: "boldItalic", name: "Bold Italic", char: "𝙱", cmd: "boldItalic" },
    { id: "fraktur", name: "Fraktur", char: "𝔉", cmd: "fraktur" },
    {
      id: "doubleStruck",
      name: "Double Struck",
      char: "𝕊",
      cmd: "doubleStruck",
    },
    { id: "smallCaps", name: "Small Caps", char: "ꜱ", cmd: "smallCaps" },
    { id: "upsideDown", name: "Upside Down", char: "ɐ", cmd: "upsideDown" },
  ];

  function createSuggestionButton() {
    const btn = document.createElement("button");
    btn.className =
      "unicode-suggestion-btn absolute bottom-2 right-2 w-7 h-7 rounded-full bg-green-500/90 text-white flex items-center justify-center shadow-md border border-green-500/30 z-[9999] transition-transform hover:scale-105";
    btn.style.cssText = `
      position: absolute !important;
      bottom: 8px !important;
      right: 8px !important;
      width: 28px !important;
      height: 28px !important;
      border-radius: 50% !important;
      background-color: rgba(34, 197, 94, 0.9) !important;
      color: white !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 9999 !important;
    `;
    btn.innerHTML = `
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
      </svg>`;
    btn.title = "Suggestion styles";
    return btn;
  }

  function createSuggestionPopup() {
    const popup = document.createElement("div");
    popup.className =
      "unicode-suggestion-popup hidden w-64 bg-gray-800 border border-zinc-600 rounded-lg shadow-lg text-zinc-200 z-[10000] transition-all duration-200 ease-out";
    popup.style.cssText = `
      position: fixed !important;
      width: 256px !important;
      background-color: #27272a !important;
      border: 1px solid #52525b !important;
      border-radius: 8px !important;
      color: #d4d4d8 !important;
      z-index: 10000 !important;
    `;
    popup.innerHTML = `
      <div class="p-3 border-b border-zinc-700 bg-gray-900" style="padding: 12px !important; border-bottom: 1px solid #3f3f46 !important; background-color: #18181b !important;">
        <div class="flex items-center gap-2 text-sm font-medium">
          <span>Suggestion Styles</span>
        </div>
      </div>
      <div class="suggestion-options max-h-64 overflow-y-auto p-2 bg-gray-900" style="max-height: 256px !important; overflow-y: auto !important; padding: 8px !important; background-color: #18181b !important;">
        ${STYLES.map(
          (style) => `
            <button class="w-full text-left p-2 rounded flex items-center gap-2 hover:bg-zinc-700" data-cmd="${style.cmd}" style="width: 100% !important; text-align: left !important; padding: 8px !important; border-radius: 4px !important; display: flex !important; align-items: center !important; gap: 8px !important;">
              <span class="w-6" style="width: 24px !important;">${style.char}</span> ${style.name}
            </button>
          `
        ).join("")}
      </div>
    `;
    return popup;
  }

  function positionPopup(popup, btn) {
    const btnRect = btn.getBoundingClientRect();
    popup.style.left = `${btnRect.right - popup.offsetWidth}px`;
    popup.style.top = `${btnRect.top - popup.offsetHeight - 8}px`;

    const popupRect = popup.getBoundingClientRect();
    if (popupRect.left < 0) popup.style.left = "0px";
    if (popupRect.top < 0) popup.style.top = `${btnRect.bottom + 8}px`;
  }

  function isTextInputElement(element) {
    const isStandardTextInput =
      (element instanceof HTMLInputElement && element.type === "text") ||
      element instanceof HTMLTextAreaElement;

    const isContenteditable =
      element instanceof HTMLElement &&
      element.getAttribute("contenteditable") === "true";

    const isSocialMediaEditor =
      element.classList.contains("public-DraftEditor-content") ||
      element.classList.contains("notranslate") ||
      element.getAttribute("role") === "textbox" ||
      element.hasAttribute("data-lexical-editor") ||
      element.classList.contains("composer-text") ||
      element.getAttribute("aria-label")?.toLowerCase().includes("post") ||
      element.getAttribute("aria-label")?.toLowerCase().includes("comment") ||
      element.getAttribute("aria-label")?.toLowerCase().includes("tweet") ||
      element.getAttribute("data-id")?.includes("composer");

    const isSearchInput =
      element instanceof HTMLInputElement && element.type === "search";
    const isSearchRole =
      element.getAttribute("role") === "searchbox" ||
      element.getAttribute("role") === "combobox";
    const ariaLabel = element.getAttribute("aria-label");
    const isSearchAriaLabel =
      typeof ariaLabel === "string" &&
      ariaLabel.toLowerCase().includes("search");
    const placeholder = element.getAttribute("placeholder");
    const isSearchPlaceholder =
      typeof placeholder === "string" &&
      placeholder.toLowerCase().includes("search");
    const isSearchClass =
      element.className && element.className.toLowerCase().includes("search");

    if (
      isSearchInput ||
      isSearchRole ||
      isSearchAriaLabel ||
      isSearchPlaceholder ||
      isSearchClass
    ) {
      return false;
    }

    return isStandardTextInput || isContenteditable || isSocialMediaEditor;
  }

  function isElementSuitable(element) {
    const rect = element.getBoundingClientRect();
    return rect.height >= MIN_INPUT_HEIGHT && rect.width >= MIN_INPUT_WIDTH / 2;
  }

  function findSuitableContainer(element) {
    let container = element.parentElement;
    while (container) {
      const rect = container.getBoundingClientRect();
      if (rect.width >= MIN_INPUT_WIDTH && rect.height >= MIN_INPUT_HEIGHT) {
        return container;
      }
      container = container.parentElement;
    }
    return element.parentElement;
  }

  function setupInputElement(input) {
    if (input.hasAttribute("data-unicode-processed")) return;
    input.setAttribute("data-unicode-processed", "true");

    const container = findSuitableContainer(input);
    if (!container) {
      console.log("No suitable container found for:", input);
      return;
    }

    let btn, popup, idleTimeoutId;

    function addSuggestionUI() {
      if (btn && popup) return;

      console.log(
        "Adding suggestion UI to:",
        input,
        "on",
        window.location.hostname
      );
      container.classList.add("relative");
      btn = createSuggestionButton();
      popup = createSuggestionPopup();
      container.appendChild(btn);
      document.body.appendChild(popup);

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        console.log(
          "Button clicked, toggling popup on",
          window.location.hostname
        );
        popup.classList.toggle("hidden");
        if (!popup.classList.contains("hidden")) {
          positionPopup(popup, btn);
          popup.classList.remove("scale-95", "opacity-0");
          popup.classList.add("scale-100", "opacity-100");
          resetIdleTimer();
        } else {
          popup.classList.remove("scale-100", "opacity-100");
          popup.classList.add("scale-95", "opacity-0");
          clearTimeout(idleTimeoutId);
        }
      });

      popup.addEventListener("mouseover", resetIdleTimer);
      popup.addEventListener("mouseleave", resetIdleTimer);

      popup.querySelectorAll(".suggestion-options button").forEach((option) => {
        option.addEventListener("click", () => {
          const cmd = option.getAttribute("data-cmd");
          console.log("Applying style:", cmd, "on", window.location.hostname);
          applyStyle(input, cmd);
          popup.classList.add("hidden");
          popup.classList.remove("scale-100", "opacity-100");
          popup.classList.add("scale-95", "opacity-0");
          clearTimeout(idleTimeoutId);
        });
      });
    }

    function resetIdleTimer() {
      clearTimeout(idleTimeoutId);
      if (popup && !popup.classList.contains("hidden")) {
        idleTimeoutId = setTimeout(() => {
          console.log(
            "Idle timeout, hiding popup on",
            window.location.hostname
          );
          popup.classList.add("hidden");
          popup.classList.remove("scale-100", "opacity-100");
          popup.classList.add("scale-95", "opacity-0");
        }, IDLE_TIMEOUT);
      }
    }

    if (input.tagName === "INPUT" || input.tagName === "TEXTAREA") {
      input.addEventListener("input", () => {
        if (!btn && input.value.trim()) {
          console.log(
            "Input detected in standard input:",
            input.value,
            "on",
            window.location.hostname
          );
          addSuggestionUI();
        }
      });
    } else if (input.getAttribute("contenteditable") === "true") {
      const observer = new MutationObserver(() => {
        if (!btn && input.textContent.trim()) {
          console.log(
            "Mutation detected in contenteditable:",
            input.textContent,
            "on",
            window.location.hostname
          );
          addSuggestionUI();
        }
      });
      observer.observe(input, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      input.addEventListener("input", () => {
        if (!btn && input.textContent.trim()) {
          console.log(
            "Input detected in contenteditable:",
            input.textContent,
            "on",
            window.location.hostname
          );
          addSuggestionUI();
        }
      });
    }
  }

  function setupInputListeners() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              if (isTextInputElement(node) && isElementSuitable(node)) {
                setupInputElement(node);
              }
              node
                .querySelectorAll(
                  "input, textarea, [contenteditable='true'], [role='textbox']"
                )
                .forEach((input) => {
                  if (isTextInputElement(input) && isElementSuitable(input)) {
                    setupInputElement(input);
                  }
                });
            }
          });
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    document
      .querySelectorAll(
        "input, textarea, [contenteditable='true'], [role='textbox']"
      )
      .forEach((input) => {
        if (isTextInputElement(input) && isElementSuitable(input)) {
          setupInputElement(input);
        }
      });
  }

  function checkSocialEditors() {
    document
      .querySelectorAll(".ql-editor, [contenteditable='true']")
      .forEach((input) => {
        if (isElementSuitable(input)) setupInputElement(input);
      });
    document
      .querySelectorAll(".public-DraftEditor-content")
      .forEach((input) => {
        if (isElementSuitable(input)) setupInputElement(input);
      });
    document.querySelectorAll("[role='textbox']").forEach((input) => {
      if (isElementSuitable(input)) setupInputElement(input);
    });
    document
      .querySelectorAll("[aria-label*='tweet'], [aria-label*='post']")
      .forEach((input) => {
        if (isElementSuitable(input)) setupInputElement(input);
      });
  }

  setupInputListeners();
  checkSocialEditors();
  setInterval(checkSocialEditors, 2000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initUnicodeSuggestions);
} else {
  initUnicodeSuggestions();
}
