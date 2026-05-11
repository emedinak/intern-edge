const API_BASE = window.location.hostname === "localhost" ? "http://localhost:3000" : "";

let history = [];
let cvText = "";
let jobText = "";
let isLoading = false;

async function handleUpload(inputId, labelId, labelTextId, statusId, type) {
  const input = document.getElementById(inputId);
  const label = document.getElementById(labelId);
  const labelText = document.getElementById(labelTextId);
  const status = document.getElementById(statusId);

  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    labelText.textContent = "Uploading...";
    status.textContent = "";
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/api/extract-pdf`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (type === "cv") cvText = data.text;
      if (type === "job") jobText = data.text;
      const shortName = file.name.length > 22 ? file.name.slice(0, 20) + "..." : file.name;
      labelText.textContent = shortName;
      label.classList.add("uploaded");
      status.textContent = "Extracted successfully";
    } catch (err) {
      labelText.textContent = "Choose PDF";
      label.classList.remove("uploaded");
      status.textContent = "Failed to read file";
      status.style.color = "#EF4444";
    }
  });
}

handleUpload("cv-upload", "cv-label", "cv-label-text", "cv-status", "cv");

function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 140) + "px";
}

function handleKey(e) {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function quickSend(text) {
  document.getElementById("input").value = text;
  sendMessage();
}

function formatText(text) {
  text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/```([\s\S]*?)```/g, "<pre>$1</pre>");
  text = text.replace(/`([^`]+)`/g, "<code style='background:rgba(0,0,0,0.07);padding:1px 5px;border-radius:4px;font-size:12px'>$1</code>");
  return text.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
}

function addMessage(role, content) {
  const messages = document.getElementById("messages");
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.innerHTML = `<div class="msg-avatar">${role === "assistant" ? "IE" : "You"}</div><div class="msg-bubble">${formatText(content)}</div>`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function showTyping() {
  const messages = document.getElementById("messages");
  const div = document.createElement("div");
  div.className = "msg assistant";
  div.id = "typing-indicator";
  div.innerHTML = `<div class="msg-avatar">IE</div><div class="msg-bubble typing"><span></span><span></span><span></span></div>`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function removeTyping() {
  const t = document.getElementById("typing-indicator");
  if (t) t.remove();
}

async function sendMessage() {
  if (isLoading) return;
  const input = document.getElementById("input");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  input.style.height = "auto";
  addMessage("user", text);
  history.push({ role: "user", content: text });
  isLoading = true;
  document.getElementById("sendBtn").disabled = true;
  showTyping();
  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history, cvText, jobText }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    removeTyping();
    addMessage("assistant", data.content);
    history.push({ role: "assistant", content: data.content });
  } catch (err) {
    removeTyping();
    addMessage("assistant", "Something went wrong. Please try again.");
  }
  isLoading = false;
  document.getElementById("sendBtn").disabled = false;
}
