function initUnicodeSuggestions() {
  const MIN_INPUT_HEIGHT = 20;
  const MIN_INPUT_WIDTH = 100;
  const IDLE_TIMEOUT = 5000;

  const STYLES = [
    { id: "bold", name: "Bold", char: "𝗕", cmd: "bold", shortcut: "Ctrl+B" },
    {
      id: "italic",
      name: "Italic",
      char: "𝘪",
      cmd: "italic",
      shortcut: "Ctrl+I",
    },
    {
      id: "script",
      name: "Script",
      char: "𝓢",
      cmd: "script",
      shortcut: "Ctrl+S",
    },
    {
      id: "monospace",
      name: "Monospace",
      char: "𝙼",
      cmd: "monospace",
      shortcut: "Ctrl+M",
    },
    {
      id: "fraktur",
      name: "Fraktur",
      char: "𝔉",
      cmd: "fraktur",
      shortcut: "Ctrl+F",
    },
    {
      id: "doubleStruck",
      name: "Double Struck",
      char: "𝕊",
      cmd: "doubleStruck",
      shortcut: "Ctrl+D",
    },
  ];

  // Inject custom CSS for consistent styling (unchanged)
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    .unicode-suggestion-btn {
      position: absolute;
      right: 8px;
      bottom: 8px;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background-color: rgba(34, 197, 94, 0.9);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(74, 222, 128, 0.3);
      transition: transform 0.2s;
      z-index: 9999;
    }
    .unicode-suggestion-btn:hover {
      transform: scale(1.1);
    }
    .unicode-suggestion-btn.hidden {
      display: none;
    }
    .unicode-suggestion-popup {
      width: 256px;
      background-color: #27272a;
      border: 1px solid #4b5563;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      color: #f4f4f5;
      z-index: 10000;
      transition: all 0.2s ease-out;
    }
    .unicode-suggestion-popup.hidden {
      display: none;
    }
    .unicode-suggestion-popup .suggestion-options {
      max-height: 256px;
      overflow-y: auto;
      padding: 8px;
      background-color: #18181b;
    }
    .unicode-suggestion-popup .suggestion-options button {
      width: 100%;
      text-align: left;
      padding: 8px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
    }
    .unicode-suggestion-popup .suggestion-options button:hover {
      background-color: #3f3f46;
    }
    .unicode-suggestion-popup .header {
      padding: 12px;
      border-bottom: 1px solid #374151;
      background-color: #18181b;
    }
  `;
  document.head.appendChild(styleSheet);

  function convertText(text, style) {
    const styleMap = window.UnicodeStyler?.styleMaps[style];
    if (!styleMap) {
      console.error(`No style map found for ${style}`);
      return text;
    }

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
    if (!input || !(input instanceof HTMLElement)) {
      console.error("Invalid input element");
      return;
    }

    const twitterEditor = input.closest('[data-testid="tweetTextarea_0"]');
    if (twitterEditor) {
      applyTwitterStyle(twitterEditor, style);
      return;
    }

    if (input.tagName === "INPUT" || input.tagName === "TEXTAREA") {
      applyStandardInputStyle(input, style);
      return;
    }

    if (input.isContentEditable) {
      applyContentEditableStyle(input, style);
    }
  }

  function applyTwitterStyle(editor, style) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const contentDiv = editor.querySelector('[data-contents="true"]');

    if (!contentDiv) {
      console.error("Could not find Twitter content div");
      return;
    }

    try {
      if (!range.collapsed) {
        const selectedText = range.toString();
        if (selectedText) {
          const styledText = convertText(selectedText, style);
          range.deleteContents();
          range.insertNode(document.createTextNode(styledText));
          triggerTwitterEvents(editor);
          return;
        }
      }

      const textNodes = getTextNodes(contentDiv);
      textNodes.forEach((node) => {
        node.nodeValue = convertText(node.nodeValue, style);
      });

      triggerTwitterEvents(editor);
    } catch (error) {
      console.error("Error applying Twitter style:", error);
    }
  }

  function getTextNodes(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }

    return textNodes;
  }

  function triggerTwitterEvents(editor) {
    const inputEvent = new InputEvent("input", {
      bubbles: true,
      cancelable: true,
    });
    editor.dispatchEvent(inputEvent);

    const changeEvent = new Event("change", {
      bubbles: true,
      cancelable: true,
    });
    editor.dispatchEvent(changeEvent);

    editor.blur();
    editor.focus();
  }

  function applyStandardInputStyle(input, style) {
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

    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function applyContentEditableStyle(element, style) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);

    if (!range.collapsed) {
      const selectedText = range.toString();
      const styledText = convertText(selectedText, style);
      range.deleteContents();
      range.insertNode(document.createTextNode(styledText));
    } else {
      element.textContent = convertText(element.textContent, style);
    }

    element.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function createSuggestionButton() {
    const btn = document.createElement("button");
    btn.className = "unicode-suggestion-btn hidden";
    btn.innerHTML = `
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
      </svg>`;
    btn.title = "Suggestion styles";
    return btn;
  }

  function createSuggestionPopup() {
    const popup = document.createElement("div");
    popup.className = "unicode-suggestion-popup hidden";
    popup.innerHTML = `
      <div class="header">
        <div class="flex items-center gap-2 text-sm font-medium">
          <span>Suggestion Styles <style class="text-zinc-300 text-[11px]">(Ctrl+[Key])</style></span>
        </div>
      </div>
      <div class="suggestion-options">
        ${STYLES.map(
          (style) => `
            <button data-cmd="${style.cmd}">
              <span class="w-6">${style.char}</span> ${style.name} <span class="ml-2  opacity-70 text-zinc-300 text-[11px]">${style.shortcut}</span>
            </button>
          `
        ).join("")}
      </div>
    `;
    return popup;
  }

  function positionPopup(popup, btn) {
    const btnRect = btn.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();

    let top = btnRect.top - popupRect.height - 8;
    let left = btnRect.right - popupRect.width;

    if (top < 3) {
      top = btnRect.bottom + 8;
    }

    if (left < 0) {
      left = btnRect.left;
    }

    if (left + popupRect.width > window.innerWidth) {
      left = window.innerWidth - popupRect.width - 8;
    }

    popup.style.position = "fixed";
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  }

  function isTextInputElement(element) {
    if (!element || !(element instanceof HTMLElement)) return false;

    // Only allow editable elements
    const isStandardTextInput =
      (element instanceof HTMLInputElement && element.type === "text") ||
      element instanceof HTMLTextAreaElement;

    const isContenteditable =
      element.getAttribute("contenteditable") === "true";

    // Specific social media editors must be editable
    const isSocialMediaEditor =
      (element.classList.contains("public-DraftEditor-content") &&
        element.isContentEditable) ||
      (element.classList.contains("notranslate") &&
        element.isContentEditable) ||
      (element.getAttribute("role") === "textbox" &&
        element.isContentEditable) ||
      (element.getAttribute("data-testid") === "tweetTextarea_0" &&
        element.isContentEditable) ||
      (element.getAttribute("aria-label")?.toLowerCase().includes("tweet") &&
        element.isContentEditable) ||
      (element.classList.contains("ql-editor") && element.isContentEditable) ||
      (element.classList.contains("msg-form__contenteditable") &&
        element.isContentEditable) ||
      (element
        .getAttribute("data-placeholder")
        ?.toLowerCase()
        .includes("share") &&
        element.isContentEditable) ||
      (element.getAttribute("aria-label")?.toLowerCase().includes("comment") &&
        element.isContentEditable) ||
      (element.getAttribute("aria-label")?.toLowerCase().includes("post") &&
        element.isContentEditable) ||
      (element.getAttribute("placeholder")?.toLowerCase().includes("comment") &&
        element.isContentEditable);

    // Comprehensive search exclusion
    const isSearchInput =
      element.type === "search" ||
      element.getAttribute("role") === "searchbox" ||
      element.getAttribute("role") === "combobox" ||
      element.getAttribute("aria-label")?.toLowerCase().includes("search") ||
      element.getAttribute("placeholder")?.toLowerCase().includes("search") ||
      element.className?.toLowerCase().includes("search") ||
      element.id?.toLowerCase().includes("search") ||
      element.name?.toLowerCase() === "q" ||
      (element.getAttribute("autocomplete") === "off" &&
        element.name?.toLowerCase().includes("search"));

    const isEditable =
      isStandardTextInput || isContenteditable || isSocialMediaEditor;
    console.debug(
      "Checking element:",
      element,
      "Is editable?",
      isEditable,
      "Is search?",
      isSearchInput
    );

    return isEditable && !isSearchInput;
  }

  function isElementSuitable(element) {
    if (!element || !(element instanceof HTMLElement)) return false;
    const rect = element.getBoundingClientRect();
    return rect.height >= MIN_INPUT_HEIGHT && rect.width >= MIN_INPUT_WIDTH;
  }

  function findDeepEditor(element) {
    if (!element || !(element instanceof HTMLElement)) {
      console.debug("findDeepEditor: Invalid element", element);
      return null;
    }

    if (!isTextInputElement(element)) {
      console.debug(
        "findDeepEditor: Element is not a valid text input",
        element
      );
      return null;
    }

    const twitterEditor =
      element.closest('[data-testid="tweetTextarea_0"]') ||
      element.querySelector('[data-testid="tweetTextarea_0"]');
    if (
      twitterEditor &&
      twitterEditor.getAttribute("contenteditable") === "true"
    ) {
      console.debug("findDeepEditor: Found Twitter editor", twitterEditor);
      return twitterEditor;
    }

    const linkedinEditor =
      element.closest(".ql-editor") ||
      element.closest(".msg-form__contenteditable");
    if (linkedinEditor && linkedinEditor.isContentEditable)
      return linkedinEditor;

    const facebookEditor =
      element.querySelector('[data-text="true"]') ||
      element.closest(".notranslate");
    if (facebookEditor && facebookEditor.isContentEditable)
      return facebookEditor;

    if (element.matches("textarea")) return element;

    return element.isContentEditable ? element : null;
  }

  function setupInputElement(input) {
    if (
      !input ||
      !(input instanceof HTMLElement) ||
      input.hasAttribute("data-unicode-processed")
    ) {
      return;
    }

    const targetInput = findDeepEditor(input);
    if (!targetInput) {
      console.debug(
        "setupInputElement: No valid target input found for",
        input
      );
      return;
    }

    targetInput.setAttribute("data-unicode-processed", "true");
    if (!isElementSuitable(targetInput)) return;

    const container = targetInput.parentElement;
    if (!container) return;

    container.classList.add("relative");
    const btn = createSuggestionButton();
    const popup = createSuggestionPopup();
    container.appendChild(btn);
    document.body.appendChild(popup);

    let timeoutId, idleTimeoutId;

    const checkInput = () => {
      if (!isElementSuitable(targetInput)) {
        btn.classList.add("hidden");
        popup.classList.add("hidden");
        return;
      }
      const text = targetInput.value || targetInput.textContent || "";
      if (text.length >= 3) {
        btn.classList.remove("hidden");
      } else {
        btn.classList.add("hidden");
        popup.classList.add("hidden");
      }
    };

    const resetIdleTimer = () => {
      clearTimeout(idleTimeoutId);
      if (!popup.classList.contains("hidden")) {
        idleTimeoutId = setTimeout(() => {
          popup.classList.add("hidden");
          popup.classList.remove("scale-100", "opacity-100");
          popup.classList.add("scale-95", "opacity-0");
        }, IDLE_TIMEOUT);
      }
    };

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      popup.classList.toggle("hidden");
      if (!popup.classList.contains("hidden")) {
        positionPopup(popup, btn);
        popup.classList.remove("scale-95", "opacity-0");
        popup.classList.add("scale-100", "opacity-100");
        resetIdleTimer();
      } else {
        popup.classList.remove("scale-100", "opacity-100");
        popup.classList.add("scale-95", "opacity-0");
      }
    });

    document.addEventListener("click", (e) => {
      if (
        !popup.classList.contains("hidden") &&
        !popup.contains(e.target) &&
        !btn.contains(e.target)
      ) {
        popup.classList.add("hidden");
        popup.classList.remove("scale-100", "opacity-100");
        popup.classList.add("scale-95", "opacity-0");
        clearTimeout(idleTimeoutId);
      }
    });

    popup.querySelectorAll(".suggestion-options button").forEach((option) => {
      option.addEventListener("click", (e) => {
        e.preventDefault();
        const cmd = option.getAttribute("data-cmd");
        if (cmd) {
          console.debug("Applying style", cmd, "to", targetInput);
          applyStyle(targetInput, cmd);
        }
        popup.classList.add("hidden");
      });
    });

    targetInput.addEventListener("keydown", (e) => {
      STYLES.forEach((style) => {
        if (style.shortcut === `Ctrl+${e.key.toUpperCase()}` && e.ctrlKey) {
          e.preventDefault();
          console.debug(
            `Shortcut ${style.shortcut} triggered for ${style.cmd}`
          );
          applyStyle(targetInput, style.cmd);
        }
      });
    });

    if (targetInput.tagName === "INPUT" || targetInput.tagName === "TEXTAREA") {
      targetInput.addEventListener("input", () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(checkInput, 800);
      });
    } else if (targetInput.getAttribute("contenteditable") === "true") {
      const observer = new MutationObserver(() => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(checkInput, 800);
      });
      observer.observe(targetInput, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      targetInput.addEventListener("input", () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(checkInput, 800);
      });
    }

    checkInput();
  }

  function setupDeepDetection() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach((node) => {
            if (!(node instanceof HTMLElement)) return;

            node
              .querySelectorAll(
                "input, textarea, [contenteditable='true'], [role='textbox'], " +
                  ".ql-editor, .msg-form__contenteditable, .public-DraftEditor-content, " +
                  ".notranslate, [data-text='true'], [data-testid='tweetTextarea_0'], " +
                  "[aria-label*='tweet' i], [aria-label*='post' i], [aria-label*='comment' i], " +
                  "[placeholder*='comment' i]"
              )
              .forEach((element) => {
                if (isTextInputElement(element)) setupInputElement(element);
              });
          });
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    document
      .querySelectorAll(
        "input, textarea, [contenteditable='true'], [role='textbox'], " +
          ".ql-editor, .msg-form__contenteditable, .public-DraftEditor-content, " +
          ".notranslate, [data-text='true'], [data-testid='tweetTextarea_0'], " +
          "[aria-label*='tweet' i], [aria-label*='post' i], [aria-label*='comment' i], " +
          "[placeholder*='comment' i]"
      )
      .forEach((element) => {
        if (isTextInputElement(element)) setupInputElement(element);
      });
  }

  function checkSocialEditors() {
    document
      .querySelectorAll(
        "input, textarea, [contenteditable='true'], [role='textbox'], " +
          ".ql-editor, .msg-form__contenteditable, .public-DraftEditor-content, " +
          ".notranslate, [data-text='true'], [data-testid='tweetTextarea_0'], " +
          "[aria-label*='tweet' i], [aria-label*='post' i], [aria-label*='comment' i], " +
          "[placeholder*='comment' i]"
      )
      .forEach((element) => {
        if (isTextInputElement(element)) setupInputElement(element);
      });
  }

  setupDeepDetection();
  checkSocialEditors();
  setInterval(checkSocialEditors, 2000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initUnicodeSuggestions);
} else {
  initUnicodeSuggestions();
}
