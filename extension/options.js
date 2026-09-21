const keyInput = document.getElementById("key");
const saveButton = document.getElementById("save");
const toggleButton = document.getElementById("toggle");
const status = document.getElementById("status");

(async () => {
  const { typesafeApiKey = "" } = await chrome.storage.local.get("typesafeApiKey");
  keyInput.value = typesafeApiKey;
})();

saveButton.addEventListener("click", async () => {
  const key = keyInput.value.trim();
  if (!key) {
    status.textContent = "Paste a key first.";
    return;
  }
  await chrome.storage.local.set({ typesafeApiKey: key });
  status.textContent = "Saved locally.";
  setTimeout(() => status.textContent = "", 1800);
});

toggleButton.addEventListener("click", () => {
  const showing = keyInput.type === "text";
  keyInput.type = showing ? "password" : "text";
  toggleButton.textContent = showing ? "Show" : "Hide";
});
