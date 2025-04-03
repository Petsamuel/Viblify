function initUnicodeSuggestions() {
  const MIN_INPUT_HEIGHT = 20;
  const MIN_INPUT_WIDTH = 100;
  const IDLE_TIMEOUT = 5000;

  const STYLES = [
    { id: "bold", name: "Bold", char: "𝗕", cmd: "bold" },
    { id: "italic", name: "Italic", char: "𝘪", cmd: "italic" },
    { id: "script", name: "Script", char: "𝓢", cmd: "script" },
    { id: "monospace", name: "Monospace", char: "𝙼", cmd: "monospace" },
    { id: "fraktur", name: "Fraktur", char: "𝔉", cmd: "fraktur" },
    {
      id: "doubleStruck",
      name: "Double Struck",
      char: "𝕊",
      cmd: "doubleStruck",
    },
  ];

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
      console.error("applyStyle: Invalid input", input);
      return;
    }

    if (input.tagName === "INPUT" || input.tagName === "TEXTAREA") {
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
          input.textContent = convertText(input.textContent || "", style);
        }
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    } else {
      console.warn("applyStyle: Unsupported input type", input);
    }
  }

  function createSuggestionButton() {
    const btn = document.createElement("button");
    btn.className = `
      absolute right-2 bottom-2 w-7 h-7 rounded-full
      bg-green-500/90 text-white flex items-center
      justify-center shadow-md hover:scale-110
      transition-all duration-200 z-[9999] hidden
      border border-green-400/30
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
      "unicode-suggestion-popup hidden w-64 bg-zinc-800 border border-zinc-600 rounded-lg shadow-lg text-zinc-200 z-[10000] transition-all duration-200 ease-out";
    popup.innerHTML = `
      <div class="p-3 border-b border-zinc-700 bg-zinc-900">
        <div class="flex items-center gap-2 text-sm font-medium">
          <span>Suggestion Styles</span>
        </div>
      </div>
      <div class="suggestion-options max-h-64 overflow-y-auto p-2 bg-zinc-900">
        ${STYLES.map(
          (style) => `
            <button class="w-full text-left p-2 rounded flex items-center gap-2 hover:bg-zinc-700" data-cmd="${style.cmd}">
              <span class="w-6">${style.char}</span> ${style.name}
            </button>
          `
        ).join("")}
      </div>
    `;
    return popup;
  }

  function positionPopup(popup, btn) {
    const btnRect = btn.getBoundingClientRect();
    popup.style.position = "fixed";
    popup.style.left = `${btnRect.right - popup.offsetWidth}px`;
    popup.style.top = `${btnRect.top - popup.offsetHeight - 8}px`;

    const popupRect = popup.getBoundingClientRect();
    if (popupRect.left < 0) popup.style.left = "0px";
    if (popupRect.top < 0) popup.style.top = `${btnRect.bottom + 8}px`;
  }

  function isTextInputElement(element) {
    if (!element || !(element instanceof HTMLElement)) return false;

    const isStandardTextInput =
      (element instanceof HTMLInputElement && element.type === "text") ||
      element instanceof HTMLTextAreaElement;

    const isContenteditable =
      element.getAttribute("contenteditable") === "true";

    const isSocialMediaEditor =
      // Twitter
      element.classList.contains("public-DraftEditor-content") ||
      element.classList.contains("notranslate") ||
      element.getAttribute("role") === "textbox" ||
      element.getAttribute("aria-label")?.toLowerCase().includes("tweet") ||
      // LinkedIn
      element.classList.contains("ql-editor") ||
      element.classList.contains("msg-form__contenteditable") ||
      element
        .getAttribute("data-placeholder")
        ?.toLowerCase()
        .includes("share") ||
      // Facebook
      element.getAttribute("aria-label")?.toLowerCase().includes("comment") ||
      element.getAttribute("aria-label")?.toLowerCase().includes("post") ||
      // Instagram
      element.getAttribute("placeholder")?.toLowerCase().includes("comment");

    const isSearchInput =
      element.type === "search" ||
      element.getAttribute("role") === "searchbox" ||
      element.getAttribute("aria-label")?.toLowerCase().includes("search") ||
      element.className?.toLowerCase().includes("search");

    return (
      (isStandardTextInput || isContenteditable || isSocialMediaEditor) &&
      !isSearchInput
    );
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

    // Twitter
    if (element.matches('[data-testid="tweetTextarea_0"]')) return element;
    const twitterEditor =
      element.querySelector('[data-text="true"]') ||
      element.closest(".public-DraftEditor-content");
    if (twitterEditor) return twitterEditor;

    // LinkedIn
    const linkedinEditor =
      element.closest(".ql-editor") ||
      element.closest(".msg-form__contenteditable");
    if (linkedinEditor) return linkedinEditor;

    // Facebook
    const facebookEditor =
      element.querySelector('[data-text="true"]') ||
      element.closest(".notranslate");
    if (facebookEditor) return facebookEditor;

    // Instagram
    if (element.matches("textarea")) return element;

    // Generic contenteditable
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

    // Outside click handler
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
                  ".notranslate, [data-text='true'], [aria-label*='tweet' i], " +
                  "[aria-label*='post' i], [aria-label*='comment' i], [placeholder*='comment' i]"
              )
              .forEach(setupInputElement);
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    document
      .querySelectorAll(
        "input, textarea, [contenteditable='true'], [role='textbox'], " +
          ".ql-editor, .msg-form__contenteditable, .public-DraftEditor-content, " +
          ".notranslate, [data-text='true'], [aria-label*='tweet' i], " +
          "[aria-label*='post' i], [aria-label*='comment' i], [placeholder*='comment' i]"
      )
      .forEach(setupInputElement);
  }

  function checkSocialEditors() {
    document
      .querySelectorAll(
        ".ql-editor, .msg-form__contenteditable, [contenteditable='true'], " +
          ".public-DraftEditor-content, .notranslate, [role='textbox'], " +
          "[aria-label*='tweet' i], [aria-label*='post' i], [aria-label*='comment' i], " +
          "[placeholder*='comment' i]"
      )
      .forEach(setupInputElement);
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
