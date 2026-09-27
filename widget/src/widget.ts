(() => {
  type WidgetWindow = Window & { __xingheWidget?: boolean };
  type ChatResponse = {
    answer: string;
    handoff: boolean;
    suggestions?: string[];
  };

  const pageWindow = window as WidgetWindow;
  if (pageWindow.__xingheWidget) return;
  pageWindow.__xingheWidget = true;

  const script = document.currentScript as HTMLScriptElement | null;
  const title = script?.dataset.title?.trim() || "星河大学智能助手";
  // 小部件会嵌在别人的网站上，接口仍在我们自己的域名。用 widget.js 的地址推出接口，而不是用当前网页的域名。
  const apiUrl = resolveApi(script);
  // 留言接口和提问接口在同一台服务器上，只是路径从 /chat 换成 /leads。
  const leadsUrl = apiUrl.replace(/\/chat\/?$/, "/leads");

  const host = document.createElement("div");
  // 宿主页面可能给所有 div 写样式。这个节点在 Shadow DOM 外面，只能用行内样式钉住。
  for (const [property, value] of [
    ["all", "initial"],
    ["display", "block"],
    ["position", "fixed"],
    ["inset", "0"],
    ["width", "100%"],
    ["height", "100%"],
    ["z-index", "2147483000"],
    ["pointer-events", "none"],
  ] as const) {
    host.style.setProperty(property, value, "important");
  }

  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .root {
        font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
        color: #1a1a1a;
        line-height: 1.5;
        box-sizing: border-box;
      }
      .root, .root * { box-sizing: border-box; }
      .bubble, .panel { pointer-events: auto; }
      .bubble {
        position: fixed;
        right: 16px;
        bottom: 16px;
        width: 56px;
        height: 56px;
        border: 0;
        border-radius: 50%;
        background: #1d4e89;
        color: #fff;
        cursor: pointer;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
      }
      .panel {
        display: none;
        position: fixed;
        right: 16px;
        bottom: 84px;
        width: min(360px, calc(100vw - 32px));
        height: min(520px, calc(100vh - 120px));
        flex-direction: column;
        background: #fff;
        color: #1a1a1a;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
      }
      .panel.is-open { display: flex; }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 12px 14px;
        background: #1d4e89;
        color: #fff;
        font-size: 15px;
        font-weight: 600;
      }
      .close {
        width: 32px;
        height: 32px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-size: 20px;
      }
      .log {
        flex: 1;
        overflow: auto;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        background: #f7f8fa;
      }
      .msg {
        max-width: 85%;
        padding: 8px 10px;
        border-radius: 12px;
        white-space: pre-wrap;
        word-break: break-word;
        font-size: 14px;
      }
      .msg.user { align-self: flex-end; background: #1d4e89; color: #fff; }
      .msg.bot { align-self: flex-start; background: #fff; color: #1a1a1a; }
      .suggestions { display: flex; flex-wrap: wrap; gap: 6px; }
      .suggestions button {
        border: 1px solid #d0d7e2;
        background: #fff;
        color: #1d4e89;
        border-radius: 999px;
        padding: 6px 10px;
        font-size: 13px;
        cursor: pointer;
      }
      form.ask {
        display: flex;
        gap: 8px;
        padding: 12px;
        background: #fff;
        border-top: 1px solid #e6e8ee;
      }
      .lead {
        align-self: stretch;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px;
        background: #fff;
        border-radius: 12px;
      }
      .lead .hint { margin: 0; font-size: 13px; }
      .lead .field { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
      .lead input, .lead textarea { width: 100%; flex: none; }
      .lead textarea {
        min-height: 72px;
        border: 1px solid #d0d7e2;
        border-radius: 10px;
        padding: 8px 10px;
        font: inherit;
        font-size: 16px;
        color: #1a1a1a;
        background: #fff;
        resize: vertical;
      }
      .lead .error { margin: 0; color: #9b2c2c; font-size: 13px; }
      input {
        flex: 1;
        min-width: 0;
        height: 44px;
        border: 1px solid #d0d7e2;
        border-radius: 10px;
        padding: 0 10px;
        font: inherit;
        font-size: 16px;
        color: #1a1a1a;
        background: #fff;
      }
      .send {
        height: 44px;
        padding: 0 14px;
        border: 0;
        border-radius: 10px;
        background: #1d4e89;
        color: #fff;
        cursor: pointer;
      }
      button:disabled { opacity: 0.6; cursor: default; }
      @media (max-width: 640px) {
        .bubble { right: 12px; bottom: calc(12px + env(safe-area-inset-bottom)); }
        .panel {
          left: 12px;
          right: 12px;
          width: auto;
          bottom: calc(80px + env(safe-area-inset-bottom));
          height: min(75vh, 640px);
        }
      }
    </style>
    <div class="root">
      <button class="bubble" type="button" aria-expanded="false" aria-label="打开聊天">
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
          <path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"></path>
        </svg>
      </button>
      <section class="panel" aria-label="${escapeAttr(title)}">
        <div class="header">
          <span></span>
          <button class="close" type="button" aria-label="关闭">×</button>
        </div>
        <div class="log"></div>
        <form class="ask">
          <input maxlength="200" placeholder="输入问题" aria-label="问题" />
          <button class="send" type="submit">发送</button>
        </form>
      </section>
    </div>
  `;

  const bubble = shadow.querySelector(".bubble") as HTMLButtonElement;
  const panel = shadow.querySelector(".panel") as HTMLElement;
  const heading = shadow.querySelector(".header span") as HTMLElement;
  const closeButton = shadow.querySelector(".close") as HTMLButtonElement;
  const log = shadow.querySelector(".log") as HTMLElement;
  const form = shadow.querySelector("form") as HTMLFormElement;
  const input = shadow.querySelector("input") as HTMLInputElement;
  const sendButton = shadow.querySelector(".send") as HTMLButtonElement;
  heading.textContent = title;

  let sending = false;
  appendBot("你好，我是星河大学智能助手。可以问我报到、宿舍、校园卡这些事。");

  bubble.addEventListener("click", () => setOpen(!panel.classList.contains("is-open")));
  closeButton.addEventListener("click", () => setOpen(false));
  shadow.addEventListener("keydown", (event) => {
    if (event instanceof KeyboardEvent && event.key === "Escape") setOpen(false);
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void ask(input.value);
  });

  function setOpen(next: boolean) {
    panel.classList.toggle("is-open", next);
    bubble.setAttribute("aria-expanded", next ? "true" : "false");
    bubble.setAttribute("aria-label", next ? "关闭聊天" : "打开聊天");
    if (next && !window.matchMedia("(pointer: coarse)").matches) input.focus();
  }

  function appendUser(text: string) {
    log.appendChild(messageNode("user", text));
    scrollLog();
  }

  function appendBot(text: string) {
    const node = messageNode("bot", text);
    log.appendChild(node);
    scrollLog();
    return node;
  }

  function messageNode(role: "user" | "bot", text: string) {
    const node = document.createElement("div");
    node.className = `msg ${role}`;
    node.textContent = text;
    return node;
  }

  function scrollLog() {
    log.scrollTop = log.scrollHeight;
  }

  // 相关问题直接再问一次，访客不用自己把句子重新打一遍。
  function appendSuggestions(questions: string[]) {
    const row = document.createElement("div");
    row.className = "suggestions";
    for (const question of questions) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = question;
      button.addEventListener("click", () => void ask(question));
      row.appendChild(button);
    }
    log.appendChild(row);
    scrollLog();
  }

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || sending) return;
    sending = true;
    input.value = "";
    appendUser(trimmed);
    const pending = appendBot("正在查找…");
    input.disabled = true;
    sendButton.disabled = true;
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        pending.textContent = readError(data);
        return;
      }
      if (!isChatResponse(data)) {
        pending.textContent = "接口返回了无法识别的内容。";
        return;
      }
      pending.textContent = data.answer;
      if (data.suggestions && data.suggestions.length > 0) {
        appendSuggestions(data.suggestions);
      }
      if (data.handoff) appendLeadForm(trimmed, data.answer);
    } catch {
      pending.textContent = "网络请求失败，请稍后再试。";
    } finally {
      sending = false;
      input.disabled = false;
      sendButton.disabled = false;
    }
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // 答不上来时当场留下联系方式。问题先填好，访客可以改完再提交。
  function appendLeadForm(question: string, botAnswer: string) {
    const box = document.createElement("form");
    box.className = "lead";

    const hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent = "留下邮箱，招生办会通过邮件回复你。";

    const emailField = labeledField("邮箱");
    const emailInput = emailField.querySelector("input") as HTMLInputElement;
    emailInput.type = "email";
    emailInput.required = true;
    emailInput.maxLength = 254;
    emailInput.autocomplete = "email";

    const questionField = document.createElement("label");
    questionField.className = "field";
    const questionLabel = document.createElement("span");
    questionLabel.textContent = "问题";
    const questionInput = document.createElement("textarea");
    questionInput.required = true;
    questionInput.maxLength = 200;
    questionInput.value = question;
    questionField.append(questionLabel, questionInput);

    const error = document.createElement("p");
    error.className = "error";
    error.hidden = true;

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "send";
    submit.textContent = "提交留言";

    box.append(hint, emailField, questionField, error, submit);
    box.addEventListener("submit", (event) => {
      event.preventDefault();
      void sendLead(box, emailInput, questionInput, error, submit, botAnswer);
    });
    log.appendChild(box);
    scrollLog();
  }

  async function sendLead(
    box: HTMLFormElement,
    emailInput: HTMLInputElement,
    questionInput: HTMLTextAreaElement,
    error: HTMLElement,
    submit: HTMLButtonElement,
    botAnswer: string,
  ) {
    const email = emailInput.value.trim();
    const question = questionInput.value.trim();
    error.hidden = true;
    if (!emailPattern.test(email)) {
      error.hidden = false;
      error.textContent = "邮箱格式不正确";
      return;
    }
    if (!question) {
      error.hidden = false;
      error.textContent = "问题不能为空";
      return;
    }

    submit.disabled = true;
    try {
      const response = await fetch(leadsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, question, botAnswer }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        error.hidden = false;
        error.textContent = readError(data);
        submit.disabled = false;
        return;
      }
      const done = messageNode("bot", "已收到。招生办会通过邮件回复你。");
      box.replaceWith(done);
      scrollLog();
    } catch {
      error.hidden = false;
      error.textContent = "网络请求失败，请稍后再试。";
      submit.disabled = false;
    }
  }

  function labeledField(label: string) {
    const wrap = document.createElement("label");
    wrap.className = "field";
    const span = document.createElement("span");
    span.textContent = label;
    wrap.append(span, document.createElement("input"));
    return wrap;
  }

  function mount() {
    document.body.appendChild(host);
  }

  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);

  function resolveApi(current: HTMLScriptElement | null) {
    const override = current?.dataset.api?.trim();
    if (override) {
      const url = new URL(override, window.location.href);
      if (url.pathname === "/") url.pathname = "/api/chat";
      return url.toString();
    }
    if (current?.src) return new URL("/api/chat", current.src).toString();
    return new URL("/api/chat", window.location.href).toString();
  }

  function isChatResponse(value: unknown): value is ChatResponse {
    if (typeof value !== "object" || value === null) return false;
    const record = value as Record<string, unknown>;
    return typeof record.answer === "string" && typeof record.handoff === "boolean";
  }

  function readError(value: unknown) {
    if (typeof value === "object" && value !== null && "error" in value) {
      const error = (value as { error: unknown }).error;
      if (typeof error === "string" && error) return error;
    }
    return "请求失败";
  }

  function escapeAttr(value: string) {
    return value.replace(/[&"'<>]/g, (char) => {
      const map: Record<string, string> = {
        "&": "&amp;",
        '"': "&quot;",
        "'": "&#39;",
        "<": "&lt;",
        ">": "&gt;",
      };
      return map[char] ?? char;
    });
  }
})();
