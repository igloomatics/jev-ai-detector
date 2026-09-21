const TYPESAFE_URL = "https://api.typesafe.ai/v1/systemone";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "jev-ai-score",
    title: "Check AI-like score with Jev",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "jev-ai-score" || !tab?.id) return;
  await analyzeAndShow(info.selectionText || "", tab.id);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "analyze-selection") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  try {
    const [{ result: selectedText }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString() || "",
    });
    await analyzeAndShow(selectedText, tab.id);
  } catch (error) {
    console.error(error);
  }
});

async function analyzeAndShow(text, tabId) {
  const clean = text.trim();
  if (!clean) return show(tabId, { error: "Select some text first." });
  if (clean.length > 12000) return show(tabId, { error: "Selection is too long (max 12,000 characters)." });

  const { typesafeApiKey = "" } = await chrome.storage.local.get("typesafeApiKey");
  if (!typesafeApiKey.trim()) {
    await show(tabId, { error: "No TypeSafe API key. Open the extension Options page and save one first." });
    chrome.runtime.openOptionsPage();
    return;
  }

  await show(tabId, { loading: true });

  try {
    const response = await fetch(TYPESAFE_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${typesafeApiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "jev-latest",
        state: clean,
        questions: {
          ai_generated: {
            type: "noul",
            instructions:
              "The selected text was generated primarily by an AI language model rather than written primarily by a human. Judge only from cues present in the text. Be uncertain when the evidence is weak; polished, formal, or grammatical writing alone is not sufficient evidence of AI authorship."
          }
        }
      }),
    });

    const rawText = await response.text();
    let data;
    try { data = JSON.parse(rawText); }
    catch { throw new Error(`TypeSafe returned non-JSON: ${rawText.slice(0, 200)}`); }

    if (!response.ok) throw new Error(data?.message || data?.error || `HTTP ${response.status}`);

    const score =
      data?.answers?.ai_generated?.noul ??
      data?.nouls?.ai_generated?.noul ??
      data?.ai_generated?.noul;

    if (typeof score !== "number") {
      console.error("Unexpected TypeSafe response:", data);
      throw new Error("Unexpected TypeSafe response shape. Check the service worker console for details.");
    }

    await show(tabId, { score, model: data?.model || "jev-latest" });
  } catch (error) {
    await show(tabId, { error: `Jev request failed: ${error.message}` });
  }
}

async function show(tabId, payload) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "JEV_RESULT", payload });
    return;
  } catch (_) {
    // The tab may have been open before the extension was installed/reloaded.
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    await chrome.tabs.sendMessage(tabId, { type: "JEV_RESULT", payload });
  } catch (error) {
    console.error("Could not show Jev result on this page:", error);
  }
}
