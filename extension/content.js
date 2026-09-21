chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "JEV_RESULT") return;
  renderBubble(message.payload);
});

function renderBubble(payload) {
  document.getElementById("jev-ai-detector-bubble")?.remove();

  const box = document.createElement("div");
  box.id = "jev-ai-detector-bubble";
  Object.assign(box.style, {
    position: "fixed",
    right: "22px",
    bottom: "22px",
    zIndex: "2147483647",
    width: "300px",
    padding: "16px",
    borderRadius: "14px",
    background: "rgba(20,20,22,.96)",
    color: "white",
    fontFamily: "-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif",
    fontSize: "14px",
    lineHeight: "1.4",
    boxShadow: "0 12px 40px rgba(0,0,0,.28)",
    backdropFilter: "blur(12px)",
  });

  if (payload.loading) {
    box.innerHTML = `<div style="font-weight:700">Jev is judging…</div>`;
  } else if (payload.error) {
    box.innerHTML = `<div style="font-weight:700">Jev detector</div><div style="margin-top:7px;opacity:.8"></div>`;
    box.lastElementChild.textContent = payload.error;
  } else {
    const pct = Math.round(payload.score * 100);
    const label = getLabel(payload.score);
    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong>AI-like score</strong><strong style="font-size:22px">${pct}%</strong>
      </div>
      <div style="height:7px;background:#444;border-radius:999px;margin:11px 0;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:#fff;border-radius:999px"></div>
      </div>
      <div style="font-weight:650">${label}</div>
      <div style="margin-top:6px;font-size:11px;opacity:.58">Jev Noul score · stylistic signal only, not proof of authorship</div>
    `;
  }

  const close = document.createElement("button");
  close.textContent = "×";
  Object.assign(close.style, {
    position: "absolute", top: "5px", right: "8px", border: "0",
    background: "transparent", color: "white", opacity: ".55",
    fontSize: "18px", cursor: "pointer"
  });
  close.onclick = () => box.remove();
  box.appendChild(close);
  document.documentElement.appendChild(box);

  if (!payload.loading) setTimeout(() => box.remove(), 9000);
}

function getLabel(score) {
  if (score >= 0.8) return "Strong AI-like signals";
  if (score >= 0.6) return "Some AI-like signals";
  if (score >= 0.4) return "Uncertain";
  if (score >= 0.2) return "More human-like";
  return "Strong human-like signals";
}
