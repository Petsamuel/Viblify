function initUnicodeSuggestions() {
  const MIN_INPUT_HEIGHT = 20;
  const MIN_INPUT_WIDTH = 100;
  const IDLE_TIMEOUT = 8000;

  // Helper function to detect Mac OS
  const isMac = () => navigator.platform.toUpperCase().includes("MAC");

  // Text sample for previews
  let previewText = "Abc";

  // Active style layers
  let activeLayers = [];

  // Site-specific theme detection
  const SITE_THEMES = [
    {
      name: "twitter",
      patterns: ["twitter.com", "x.com"],
      primaryColor: "#1da1f2",
    },
    {
      name: "facebook",
      patterns: ["facebook.com", "fb.com"],
      primaryColor: "#4267B2",
    },
    {
      name: "linkedin",
      patterns: ["linkedin.com"],
      primaryColor: "#0077b5",
    },
    {
      name: "instagram",
      patterns: ["instagram.com"],
      primaryColor: "#e1306c",
    },
    {
      name: "reddit",
      patterns: ["reddit.com"],
      primaryColor: "#ff5600",
    },
    {
      name: "github",
      patterns: ["github.com"],
      primaryColor: "#24292e",
    },
  ];

  // Currency categories
  const CURRENCY_CATEGORIES = [
    {
      name: "Popular",
      symbols: [
        { id: "usd", name: "US Dollar", symbol: "$" },
        { id: "eur", name: "Euro", symbol: "€" },
        { id: "gbp", name: "British Pound", symbol: "£" },
        { id: "jpy", name: "Japanese Yen", symbol: "¥" },
        { id: "inr", name: "Indian Rupee", symbol: "₹" },
        { id: "btc", name: "Bitcoin", symbol: "₿" },
        { id: "rub", name: "Russian Ruble", symbol: "₽" },
        { id: "krw", name: "Korean Won", symbol: "₩" },
      ],
    },
    {
      name: "Other",
      symbols: [
        { id: "baht", name: "Thai Baht", symbol: "฿" },
        { id: "ngn", name: "Nigerian Naira", symbol: "₦" },
        { id: "peso", name: "Philippine Peso", symbol: "₱" },
        { id: "brazil", name: "Brazilian Real", symbol: "R$" },
        { id: "lira", name: "Turkish Lira", symbol: "₺" },
        { id: "cent", name: "Cent", symbol: "¢" },
        { id: "genericCurrency", name: "Currency", symbol: "¤" },
      ],
    },
  ];

  const STYLES = [
    {
      id: "bold",
      name: "Bold",
      char: "𝗕",
      cmd: "bold",
      shortcut: ["Ctrl+B", "Cmd+B"],
    },
    {
      id: "italic",
      name: "Italic",
      char: "𝘪",
      cmd: "italic",
      shortcut: ["Ctrl+I", "Cmd+I"],
    },
    {
      id: "script",
      name: "Script",
      char: "𝓢",
      cmd: "script",
      shortcut: ["Ctrl+S", "Cmd+S"],
    },
    {
      id: "monospace",
      name: "Monospace",
      char: "𝙼",
      cmd: "monospace",
      shortcut: ["Ctrl+M", "Cmd+M"],
    },
    {
      id: "fraktur",
      name: "Fraktur",
      char: "𝔉",
      cmd: "fraktur",
      shortcut: ["Ctrl+F", "Cmd+F"],
    },
    {
      id: "doubleStruck",
      name: "Double Struck",
      char: "𝕊",
      cmd: "doubleStruck",
      shortcut: ["Ctrl+D", "Cmd+D"],
    },
  ];

  // Track active popup
  let activePopup = null;

  // Track active tab
  let activeTab = "styles"; // 'styles' or 'currency'

  // Inject custom CSS for consistent styling
  function injectStyles() {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = chrome.runtime.getURL("../css/unicode.css");
    document.head.appendChild(link);
  }

  // Call it at startup
  injectStyles();

  // Detect site and apply appropriate theme
  function detectSiteTheme() {
    const currentUrl = window.location.href;
    let detectedSite = null;

    for (const site of SITE_THEMES) {
      for (const pattern of site.patterns) {
        if (currentUrl.includes(pattern)) {
          detectedSite = site.name;
          break;
        }
      }
      if (detectedSite) break;
    }

    return detectedSite;
  }

  function applyTheme(theme) {
    document.body.classList.toggle("unicode-dark", theme === "dark");
    document.body.classList.toggle("unicode-light", theme === "light");

    // Remove any existing site theme classes
    SITE_THEMES.forEach((site) => {
      document.body.classList.remove(`site-${site.name}`);
    });

    // Apply site-specific theme if detected
    const siteTheme = detectSiteTheme();
    if (siteTheme) {
      document.body.classList.add(`site-${siteTheme}`);
    }

    const popups = document.querySelectorAll(".unicode-suggestion-popup");
    popups.forEach((popup) => {
      popup.classList.toggle("dark", theme === "dark");
      popup.classList.toggle("light", theme === "light");
    });
  }

  function loadTheme(callback) {
    chrome.storage.sync.get("theme", (data) => {
      const theme = data.theme || "dark"; // Default to dark to match your original CSS
      applyTheme(theme);
      callback(theme);
    });
  }

  function toggleTheme(currentTheme) {
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    chrome.storage.sync.set({ theme: newTheme }, () => applyTheme(newTheme));
    return newTheme;
  }

  // Apply multiple style transformations for style layers
  function applyLayeredStyles(text, stylesList) {
    if (!stylesList || !stylesList.length) return text;

    let result = text;
    for (const style of stylesList) {
      result = convertText(result, style);
    }
    return result;
  }

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

  function applyStyle(input, style, isLayer = false) {
    if (!input || !(input instanceof HTMLElement)) {
      console.error("Invalid input element");
      return;
    }

    // If using style layers and this is a layer action, add/remove from layers
    if (isLayer) {
      const layerIndex = activeLayers.indexOf(style);
      if (layerIndex >= 0) {
        // Remove this layer
        activeLayers.splice(layerIndex, 1);
      } else {
        // Add this layer
        activeLayers.push(style);
      }
      // Use all active layers to transform text
      style = activeLayers.length > 0 ? activeLayers : null;
    }

    const twitterEditor = input.closest('[data-testid="tweetTextarea_0"]');
    if (twitterEditor) {
      applyTwitterStyle(twitterEditor, style, isLayer);
      return;
    }

    if (input.tagName === "INPUT" || input.tagName === "TEXTAREA") {
      applyStandardInputStyle(input, style, isLayer);
      return;
    }

    if (input.isContentEditable) {
      applyContentEditableStyle(input, style, isLayer);
    }
  }

  function applyTwitterStyle(editor, style, isLayer = false) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const contentDiv = editor.querySelector('[data-contents="true"]');

    if (!contentDiv) {
      console.error("Could not find Twitter content div");
      return;
    }

    try {
      // Get current cursor position to restore later
      const selectionState = saveTwitterSelection(contentDiv);

      if (!range.collapsed) {
        const selectedText = range.toString();
        if (selectedText) {
          let styledText;
          if (isLayer && Array.isArray(style)) {
            styledText = applyLayeredStyles(selectedText, style);
          } else if (!isLayer) {
            styledText = convertText(selectedText, style);
          } else {
            return; // No styles to apply
          }

          range.deleteContents();
          range.insertNode(document.createTextNode(styledText));
          triggerTwitterEvents(editor);

          // Restore selection
          restoreTwitterSelection(contentDiv, selectionState);
          return;
        }
      }

      const textNodes = getTextNodes(contentDiv);
      textNodes.forEach((node) => {
        if (isLayer && Array.isArray(style)) {
          node.nodeValue = applyLayeredStyles(node.nodeValue, style);
        } else if (!isLayer) {
          node.nodeValue = convertText(node.nodeValue, style);
        }
      });

      triggerTwitterEvents(editor);

      // Restore selection after applying style
      restoreTwitterSelection(contentDiv, selectionState);

      // Ensure editor maintains focus
      setTimeout(() => {
        editor.focus();
      }, 10);
    } catch (error) {
      console.error("Error applying Twitter style:", error);
    }
  }

  // Helper functions for Twitter selection preservation
  function saveTwitterSelection(containerEl) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const preSelectionRange = range.cloneRange();
      preSelectionRange.selectNodeContents(containerEl);
      preSelectionRange.setEnd(range.startContainer, range.startOffset);
      const start = preSelectionRange.toString().length;

      return {
        start: start,
        end: start + range.toString().length,
      };
    }
    return null;
  }

  function restoreTwitterSelection(containerEl, savedSel) {
    if (!savedSel) return;

    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(containerEl, 0);
    range.collapse(true);

    const nodeStack = [containerEl];
    let node,
      foundStart = false,
      stop = false;
    let charIndex = 0;

    while (!stop && (node = nodeStack.pop())) {
      if (node.nodeType === Node.TEXT_NODE) {
        const nextCharIndex = charIndex + node.length;
        if (
          !foundStart &&
          savedSel.start >= charIndex &&
          savedSel.start <= nextCharIndex
        ) {
          range.setStart(node, savedSel.start - charIndex);
          foundStart = true;
        }
        if (
          foundStart &&
          savedSel.end >= charIndex &&
          savedSel.end <= nextCharIndex
        ) {
          range.setEnd(node, savedSel.end - charIndex);
          stop = true;
        }
        charIndex = nextCharIndex;
      } else {
        let i = node.childNodes.length;
        while (i--) {
          nodeStack.push(node.childNodes[i]);
        }
      }
    }

    selection.removeAllRanges();
    selection.addRange(range);
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

    // Don't call blur() as it causes the focus issue
    // Just ensure focus is maintained with setTimeout
    setTimeout(() => {
      editor.focus();
    }, 10);
  }

  function applyStandardInputStyle(input, style, isLayer = false) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;

    if (start === end) {
      // Transform whole text
      if (isLayer && Array.isArray(style)) {
        input.value = applyLayeredStyles(text, style);
      } else if (!isLayer) {
        input.value = convertText(text, style);
      }
    } else {
      // Transform selected text
      const selectedText = text.substring(start, end);
      let styledText;

      if (isLayer && Array.isArray(style)) {
        styledText = applyLayeredStyles(selectedText, style);
      } else if (!isLayer) {
        styledText = convertText(selectedText, style);
      } else {
        return; // No styles to apply
      }

      input.value = text.substring(0, start) + styledText + text.substring(end);
    }

    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function applyContentEditableStyle(element, style, isLayer = false) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);

    if (!range.collapsed) {
      const selectedText = range.toString();
      let styledText;

      if (isLayer && Array.isArray(style)) {
        styledText = applyLayeredStyles(selectedText, style);
      } else if (!isLayer) {
        styledText = convertText(selectedText, style);
      } else {
        return; // No styles to apply
      }

      range.deleteContents();
      range.insertNode(document.createTextNode(styledText));
    } else {
      if (isLayer && Array.isArray(style)) {
        element.textContent = applyLayeredStyles(element.textContent, style);
      } else if (!isLayer) {
        element.textContent = convertText(element.textContent, style);
      }
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
    btn.title = "Viblify style";
    return btn;
  }

  function createSuggestionPopup() {
    const popup = document.createElement("div");
    popup.className = "unicode-suggestion-popup hidden";
    popup.innerHTML = `
      <div class="header flex justify-between items-center p-2 bg-gray-800 dark:bg-gray-900 light:bg-gray-200 rounded-t-md">
        <div class="flex items-center gap-2 text-sm font-medium">
          <span class="text-sm ">Suggestion Styles <br/> <span class="text-neutral-600" style="font-size:10px">(${
            isMac() ? "Cmd" : "Ctrl"
          }+[Key])</span></span>
        </div>
        <div class="flex items-center">
          <button id="theme-toggle" class="cursor-pointer text-xs p-1.5 rounded hover:bg-gray-600 dark:hover:bg-gray-700 light:hover:bg-gray-200">
            <svg class="w-4 h-4 theme-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div class="tab-navigation">
        <button class="tab-button active" data-tab="styles">Styles</button>
        <button class="tab-button" data-tab="currency">Currency</button>
      </div>
      <div class="tab-content">
        <div class="tab-pane active" data-tab-content="styles">
          <div class="suggestion-options">
            ${STYLES.map(
              (style) => `
                <button data-cmd="${style.cmd}">
                  <span class="w-6">${style.char}</span> ${
                style.name
              } <span class="ml-2 opacity-70 text-neutral-600 text-[11px]">${
                isMac() ? style.shortcut[1] : style.shortcut[0]
              }</span>
                  <span class="unicode-preview" data-preview-style="${
                    style.cmd
                  }"></span>
                </button>
              `
            ).join("")}
          </div>
        </div>
        <div class="tab-pane" data-tab-content="currency">
          <div class="currency-options">
            ${CURRENCY_CATEGORIES.map(
              (category) => `
              <div class="currency-category">
                <h3 class="currency-category-title">${category.name}</h3>
                ${category.symbols
                  .map(
                    (currency) => `
                  <button data-currency="${currency.symbol}">
                    <span class="w-6 currency-symbol">${currency.symbol}</span> ${currency.name}
                  </button>
                `
                  )
                  .join("")}
              </div>
            `
            ).join("")}
          </div>
        </div>
    `;

    // Remove layout tab logic (no layout tab)
    // Set up tab switching
    setTimeout(() => {
      const tabButtons = popup.querySelectorAll(".tab-button");
      tabButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const tabName = button.getAttribute("data-tab");
          switchTab(popup, tabName);
        });
      });
      // Setup layer application buttons
      const applyLayersBtn = popup.querySelector(".layer-apply-btn");
      const clearLayersBtn = popup.querySelector(".layer-clear-btn");

      if (applyLayersBtn) {
        applyLayersBtn.addEventListener("click", (e) => {
          e.preventDefault();
          const targetInput = popup.targetInput;
          if (!targetInput) return;

          const isTwitterEditor =
            targetInput.closest('[data-testid="tweetTextarea_0"]') !== null;

          // Apply all selected layers
          applyStyle(targetInput, activeLayers, true);

          // Update layer previews
          updateLayerPreviews(popup);

          // Focus the editor after applying
          if (isTwitterEditor) {
            setTimeout(() => targetInput.focus(), 20);
          }
        });
      }

      if (clearLayersBtn) {
        clearLayersBtn.addEventListener("click", (e) => {
          e.preventDefault();
          // Clear all checkboxes
          popup
            .querySelectorAll(".style-layer-checkbox")
            .forEach((checkbox) => {
              checkbox.checked = false;
            });

          // Clear active layers
          activeLayers = [];

          // Update previews
          updateLayerPreviews(popup);
        });
      }

      // Setup layer checkbox handling
      popup.querySelectorAll(".style-layer-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
          const layerStyle = checkbox.getAttribute("data-layer");
          const layerIndex = activeLayers.indexOf(layerStyle);

          if (checkbox.checked && layerIndex === -1) {
            activeLayers.push(layerStyle);
          } else if (!checkbox.checked && layerIndex !== -1) {
            activeLayers.splice(layerIndex, 1);
          }

          // Update layer previews
          updateLayerPreviews(popup);
        });
      });
    }, 0);

    // Keyboard navigation for suggestion popup
    popup.addEventListener("keydown", (e) => {
      const visibleTab = popup.querySelector(".tab-pane.active");
      const options = Array.from(visibleTab.querySelectorAll("button"));
      if (!options.length) return;
      let idx = options.findIndex((btn) =>
        btn.classList.contains("highlighted")
      );
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (idx >= 0) options[idx].classList.remove("highlighted");
        idx = (idx + 1) % options.length;
        options[idx].classList.add("highlighted");
        options[idx].focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (idx >= 0) options[idx].classList.remove("highlighted");
        idx = (idx - 1 + options.length) % options.length;
        options[idx].classList.add("highlighted");
        options[idx].focus();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (idx >= 0) options[idx].click();
      }
    });

    return popup;
  }

  // Function to update layer previews
  function updateLayerPreviews(popup) {
    const sampleText = previewText || "Abc";

    // Update individual layer previews
    popup.querySelectorAll("[data-layer-preview]").forEach((preview) => {
      const layerStyle = preview.getAttribute("data-layer-preview");
      preview.textContent = convertText(sampleText, layerStyle);
    });

    // If we have active layers, show a combined preview somewhere
    if (activeLayers.length > 0) {
      const combinedPreview = applyLayeredStyles(sampleText, activeLayers);
      // You can add a specific combined preview element if desired
      // Or just update something like a status text
    }
  }

  // Function to switch between tabs
  function switchTab(popup, tabName) {
    activeTab = tabName;

    // Update tab buttons
    const tabButtons = popup.querySelectorAll(".tab-button");
    tabButtons.forEach((button) => {
      if (button.getAttribute("data-tab") === tabName) {
        button.classList.add("active");
      } else {
        button.classList.remove("active");
      }
    });

    // Update tab content
    const tabPanes = popup.querySelectorAll(".tab-pane");
    tabPanes.forEach((pane) => {
      if (pane.getAttribute("data-tab-content") === tabName) {
        pane.classList.add("active");
      } else {
        pane.classList.remove("active");
      }
    });

    // Update previews for specific tabs
    if (tabName === "layers") {
      updateLayerPreviews(popup);
    }
  }

  // Enhanced smart positioning that avoids UI elements
  function smartPositionPopup(popup, btn, targetInput) {
    const btnRect = btn.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Start with default position (above the button)
    let top = btnRect.top - popupRect.height - 8;
    let left = btnRect.right - popupRect.width;

    // Check if there are important UI elements to avoid
    const uiElements = detectImportantUIElements();

    // Optimize initial position based on viewport
    // If button is too close to the top, position below
    if (top < 10) {
      top = btnRect.bottom + 8;
    }

    // Don't let popup go off-screen horizontally
    if (left < 10) {
      left = 10;
    } else if (left + popupRect.width > viewportWidth - 10) {
      left = viewportWidth - popupRect.width - 10;
    }

    // Check if popup would overlap with important UI elements
    const popupBox = {
      top,
      left,
      right: left + popupRect.width,
      bottom: top + popupRect.height,
    };

    // Try to avoid overlaps with important UI
    for (const element of uiElements) {
      if (boxesOverlap(popupBox, element)) {
        // Try positioning to different sides
        const positions = [
          { top: btnRect.bottom + 8, left }, // Bottom
          { top: btnRect.top - popupRect.height - 8, left }, // Top
          { top: btnRect.top, left: btnRect.right + 8 }, // Right
          { top: btnRect.top, left: btnRect.left - popupRect.width - 8 }, // Left
        ];

        // Find first position that doesn't overlap
        for (const pos of positions) {
          const testBox = {
            top: pos.top,
            left: pos.left,
            right: pos.left + popupRect.width,
            bottom: pos.top + popupRect.height,
          };

          if (
            !uiElements.some((el) => boxesOverlap(testBox, el)) &&
            isWithinViewport(testBox, viewportWidth, viewportHeight)
          ) {
            top = pos.top;
            left = pos.left;
            break;
          }
        }

        break;
      }
    }

    // Apply final position
    popup.style.position = "fixed";
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;

    // Track the input element to enable applying styles later
    popup.targetInput = targetInput;
  }

  // Helper function to detect if a position is within viewport
  function isWithinViewport(box, viewportWidth, viewportHeight) {
    return (
      box.top >= 0 &&
      box.left >= 0 &&
      box.right <= viewportWidth &&
      box.bottom <= viewportHeight
    );
  }

  // Helper function to check if two boxes overlap
  function boxesOverlap(box1, box2) {
    return !(
      box1.right < box2.left ||
      box1.left > box2.right ||
      box1.bottom < box2.top ||
      box1.top > box2.bottom
    );
  }

  // Detect important UI elements to avoid overlapping
  function detectImportantUIElements() {
    const elements = [];
    const currentUrl = window.location.href;

    // Social media specific elements to avoid
    if (currentUrl.includes("twitter.com") || currentUrl.includes("x.com")) {
      // Twitter navigation bar and sidebar
      document
        .querySelectorAll('header[role="banner"], nav[role="navigation"]')
        .forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            elements.push({
              top: rect.top,
              left: rect.left,
              right: rect.right,
              bottom: rect.bottom,
            });
          }
        });
    } else if (currentUrl.includes("facebook.com")) {
      // Facebook header and sidebars
      document
        .querySelectorAll('div[role="banner"], div[data-pagelet="LeftRail"]')
        .forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            elements.push({
              top: rect.top,
              left: rect.left,
              right: rect.right,
              bottom: rect.bottom,
            });
          }
        });
    } else if (currentUrl.includes("linkedin.com")) {
      // LinkedIn header and sidebars
      document.querySelectorAll("header, aside").forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          elements.push({
            top: rect.top,
            left: rect.left,
            right: rect.right,
            bottom: rect.bottom,
          });
        }
      });
    }

    // Generic fixed elements check - likely navigation or important UI
    document.querySelectorAll("*").forEach((el) => {
      if (
        window.getComputedStyle(el).position === "fixed" &&
        el.className &&
        !el.className.includes("unicode-")
      ) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 100 && rect.height > 30) {
          // Minimum size to consider
          elements.push({
            top: rect.top,
            left: rect.left,
            right: rect.right,
            bottom: rect.bottom,
          });
        }
      }
    });

    return elements;
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

    return isEditable && !isSearchInput;
  }

  function isElementSuitable(element) {
    if (!element || !(element instanceof HTMLElement)) return false;
    const rect = element.getBoundingClientRect();
    return rect.height >= MIN_INPUT_HEIGHT && rect.width >= MIN_INPUT_WIDTH;
  }

  function findDeepEditor(element) {
    if (!element || !(element instanceof HTMLElement)) {
      return null;
    }

    if (!isTextInputElement(element)) {
      return null;
    }

    const twitterEditor =
      element.closest('[data-testid="tweetTextarea_0"]') ||
      element.querySelector('[data-testid="tweetTextarea_0"]');
    if (
      twitterEditor &&
      twitterEditor.getAttribute("contenteditable") === "true"
    ) {
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

    // Check if this is a Twitter editor for special handling
    const isTwitterEditor =
      targetInput.closest('[data-testid="tweetTextarea_0"]') !== null;

    let timeoutId, idleTimeoutId;

    const checkInput = () => {
      if (!isElementSuitable(targetInput)) {
        btn.classList.add("hidden");
        popup.classList.add("hidden");
        return;
      }
      const text = targetInput.value || targetInput.textContent || "";

      // Update preview text from current content
      previewText = text.length > 0 ? text.substring(0, 3) : "Abc";

      // Update all preview spans with the current text
      updatePreviews(popup, previewText);

      if (text.length >= 3) {
        btn.classList.remove("hidden");
      } else {
        btn.classList.add("hidden");
        popup.classList.add("hidden");
      }
    };

    // Function to update all preview elements
    function updatePreviews(popupEl, text) {
      const previewElements = popupEl.querySelectorAll("[data-preview-style]");
      previewElements.forEach((el) => {
        const styleType = el.getAttribute("data-preview-style");
        el.textContent = convertText(text, styleType);
      });

      // Also update layer previews if present
      updateLayerPreviews(popupEl);
    }

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

    const hideActivePopup = () => {
      if (activePopup && activePopup !== popup) {
        activePopup.classList.add("hidden");
        activePopup.classList.remove("scale-100", "opacity-100");
        activePopup.classList.add("scale-95", "opacity-0");
      }
      activePopup = popup;
    };

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      hideActivePopup();

      popup.classList.toggle("hidden");
      if (!popup.classList.contains("hidden")) {
        // Use smart positioning
        smartPositionPopup(popup, btn, targetInput);
        popup.classList.remove("scale-95", "opacity-0");
        popup.classList.add("scale-100", "opacity-100");

        // Get the current selection or first few chars
        const selection = window.getSelection();
        if (selection.rangeCount > 0 && selection.toString().length > 0) {
          previewText = selection.toString().substring(0, 3);
        } else {
          const text = targetInput.value || targetInput.textContent || "";
          previewText = text.length > 0 ? text.substring(0, 3) : "Abc";
        }

        // Update all previews
        updatePreviews(popup, previewText);

        // Sync layer checkboxes with active layers
        popup.querySelectorAll(".style-layer-checkbox").forEach((checkbox) => {
          const layerStyle = checkbox.getAttribute("data-layer");
          checkbox.checked = activeLayers.includes(layerStyle);
        });

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

    // Add hover preview effects and click handling
    popup
      .querySelectorAll(".suggestion-options button, .currency-options button")
      .forEach((option) => {
        // Add hover effects with preview changes
        option.addEventListener("mouseenter", () => {
          const previewEl = option.querySelector(".unicode-preview");
          if (previewEl) {
            previewEl.classList.add("highlighted");
          }
        });

        option.addEventListener("mouseleave", () => {
          const previewEl = option.querySelector(".unicode-preview");
          if (previewEl) {
            previewEl.classList.remove("highlighted");
          }
        });

        // Handle style/currency application
        option.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          // Focus the input first before applying style
          if (isTwitterEditor) {
            targetInput.focus();
          }

          const cmd = option.getAttribute("data-cmd");
          const currencySymbol = option.getAttribute("data-currency");

          if (cmd) {
            if (isTwitterEditor) {
              // Special handling for Twitter
              const twitterEditor = targetInput.closest(
                '[data-testid="tweetTextarea_0"]'
              );
              if (twitterEditor) {
                // Use setTimeout to ensure focus is maintained
                setTimeout(() => {
                  applyTwitterStyle(twitterEditor, cmd);
                }, 10);
              }
            } else {
              applyStyle(targetInput, cmd);
            }
          } else if (currencySymbol) {
            // Insert currency symbol
            insertTextAtCursor(targetInput, currencySymbol);
          }

          // Only hide popup for non-Twitter editors or currency insertions
          if (!isTwitterEditor || currencySymbol) {
            popup.classList.add("hidden");
          }

          // Ensure focus is maintained for Twitter
          if (isTwitterEditor) {
            setTimeout(() => {
              targetInput.focus();
            }, 20);
          }
        });
      });

    targetInput.addEventListener("keydown", (e) => {
      STYLES.forEach((style) => {
        const key = style.shortcut[0].split("+")[1]; // Get the key part (B, I, S, etc.)
        if (
          key === e.key.toUpperCase() &&
          ((isMac() && e.metaKey) || (!isMac() && e.ctrlKey)) &&
          !e.altKey &&
          !e.shiftKey
        ) {
          // Prevent default browser behavior (especially for Ctrl+D which selects the address bar)
          e.preventDefault();
          e.stopPropagation();

          // Apply the style
          if (isTwitterEditor) {
            const twitterEditor = targetInput.closest(
              '[data-testid="tweetTextarea_0"]'
            );
            if (twitterEditor) {
              applyTwitterStyle(twitterEditor, style.cmd);
            }
          } else {
            applyStyle(targetInput, style.cmd);
          }
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

    loadTheme((currentTheme) => {
      const themeToggle = popup.querySelector("#theme-toggle");
      themeToggle.addEventListener("click", () => {
        const newTheme = toggleTheme(currentTheme);
        currentTheme = newTheme; // Update local state
        const icon = themeToggle.querySelector(".theme-icon");
        icon.innerHTML =
          newTheme === "light"
            ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>`
            : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>`;
      });
    });

    checkInput();
  }

  // Add function to insert text at cursor position
  function insertTextAtCursor(input, text) {
    if (input.tagName === "INPUT" || input.tagName === "TEXTAREA") {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      input.value =
        input.value.substring(0, start) + text + input.value.substring(end);

      // Set selection after insertion
      input.selectionStart = input.selectionEnd = start + text.length;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    } else if (input.isContentEditable) {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;

      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));

      // Move cursor after insertion
      range.setStart(range.endContainer, range.endOffset);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);

      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
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
