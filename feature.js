// Multi-Platform Limits: Avoid truncation by showing character limits for platforms
function setupPlatformLimits(input, platform) {
  const platformLimits = {
    twitter: 280,
    linkedin: 3000,
    facebook: 63206,
  };

  const limit = platformLimits[platform];
  if (!limit) return;

  const counter = document.createElement("div");
  counter.className = "platform-limit-counter";
  counter.style.position = "absolute";
  counter.style.bottom = "5px";
  counter.style.right = "5px";
  counter.style.fontSize = "12px";
  counter.style.color = "#888";

  input.parentElement.style.position = "relative";
  input.parentElement.appendChild(counter);

  const updateCounter = () => {
    const textLength = input.value.length || input.textContent.length;
    counter.textContent = `${textLength}/${limit}`;
    counter.style.color = textLength > limit ? "red" : "#888";
  };

  input.addEventListener("input", updateCounter);
  updateCounter();
}

// Live Preview: Show a live preview of styled text
function setupLivePreview(input, previewElement) {
  const updatePreview = () => {
    previewElement.innerHTML = input.value || input.textContent;
  };

  input.addEventListener("input", updatePreview);
  updatePreview();
}

// Undo/Redo: Add undo/redo functionality
function setupUndoRedo(input) {
  const history = [];
  let historyIndex = -1;

  const saveState = () => {
    const currentState = input.value || input.textContent;
    if (history[historyIndex] !== currentState) {
      history.splice(historyIndex + 1);
      history.push(currentState);
      historyIndex++;
    }
  };

  const undo = () => {
    if (historyIndex > 0) {
      historyIndex--;
      input.value = history[historyIndex];
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      input.value = history[historyIndex];
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  input.addEventListener("input", saveState);
  input.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "z") {
      e.preventDefault();
      undo();
    } else if (e.ctrlKey && e.key === "y") {
      e.preventDefault();
      redo();
    }
  });

  saveState();
}

// Custom Styles: Allow users to define their own styles
function setupCustomStyles(input, customStyles) {
  const applyCustomStyle = (styleName) => {
    const styleMap = customStyles[styleName];
    if (!styleMap) return;

    const text = input.value || input.textContent;
    const styledText = text
      .split("")
      .map((char) => styleMap[char] || char)
      .join("");

    input.value = styledText;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const styleSelector = document.createElement("select");
  styleSelector.className = "custom-style-selector";
  styleSelector.style.position = "absolute";
  styleSelector.style.top = "5px";
  styleSelector.style.right = "5px";

  Object.keys(customStyles).forEach((styleName) => {
    const option = document.createElement("option");
    option.value = styleName;
    option.textContent = styleName;
    styleSelector.appendChild(option);
  });

  styleSelector.addEventListener("change", () => {
    applyCustomStyle(styleSelector.value);
  });

  input.parentElement.style.position = "relative";
  input.parentElement.appendChild(styleSelector);
}


