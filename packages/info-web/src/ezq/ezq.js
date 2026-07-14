const copyables = document.querySelectorAll(".copyable");

for (const copyable of copyables) {
  const code = copyable.querySelector("code");
  if (!code) continue;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "copy-button";
  button.textContent = "Copy";
  button.setAttribute("aria-label", `Copy EZQ example: ${code.textContent}`);

  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(code.textContent.trim());
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.textContent = "Copy";
      }, 1600);
    } catch {
      button.textContent = "Select";
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(code);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  });

  copyable.append(button);
}
