"use strict";
(() => {
    var _a;
    const pageWindow = window;
    if (pageWindow.__xingheWidget)
        return;
    pageWindow.__xingheWidget = true;
    const script = document.currentScript;
    const title = ((_a = script === null || script === void 0 ? void 0 : script.dataset.title) === null || _a === void 0 ? void 0 : _a.trim()) || "星河大学智能助手";
    const apiUrl = resolveApi(script);
    const host = document.createElement("div");
    for (const [property, value] of [
        ["all", "initial"],
        ["display", "block"],
        ["position", "fixed"],
        ["inset", "0"],
        ["width", "100%"],
        ["height", "100%"],
        ["z-index", "2147483000"],
        ["pointer-events", "none"],
    ]) {
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
      form {
        display: flex;
        gap: 8px;
        padding: 12px;
        background: #fff;
        border-top: 1px solid #e6e8ee;
      }
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
        <form>
          <input maxlength="200" placeholder="输入问题" aria-label="问题" />
          <button class="send" type="submit">发送</button>
        </form>
      </section>
    </div>
  `;
    const bubble = shadow.querySelector(".bubble");
    const panel = shadow.querySelector(".panel");
    const heading = shadow.querySelector(".header span");
    const closeButton = shadow.querySelector(".close");
    const log = shadow.querySelector(".log");
    const form = shadow.querySelector("form");
    const input = shadow.querySelector("input");
    const sendButton = shadow.querySelector(".send");
    heading.textContent = title;
    let sending = false;
    appendBot("你好，我是星河大学智能助手。可以问我报到、宿舍、校园卡这些事。");
    bubble.addEventListener("click", () => setOpen(!panel.classList.contains("is-open")));
    closeButton.addEventListener("click", () => setOpen(false));
    shadow.addEventListener("keydown", (event) => {
        if (event instanceof KeyboardEvent && event.key === "Escape")
            setOpen(false);
    });
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        void ask(input.value);
    });
    function setOpen(next) {
        panel.classList.toggle("is-open", next);
        bubble.setAttribute("aria-expanded", next ? "true" : "false");
        bubble.setAttribute("aria-label", next ? "关闭聊天" : "打开聊天");
        if (next && !window.matchMedia("(pointer: coarse)").matches)
            input.focus();
    }
    function appendUser(text) {
        log.appendChild(messageNode("user", text));
        scrollLog();
    }
    function appendBot(text) {
        const node = messageNode("bot", text);
        log.appendChild(node);
        scrollLog();
        return node;
    }
    function messageNode(role, text) {
        const node = document.createElement("div");
        node.className = `msg ${role}`;
        node.textContent = text;
        return node;
    }
    function scrollLog() {
        log.scrollTop = log.scrollHeight;
    }
    function appendSuggestions(questions) {
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
    async function ask(question) {
        const trimmed = question.trim();
        if (!trimmed || sending)
            return;
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
            const data = await response.json();
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
        }
        catch (_a) {
            pending.textContent = "网络请求失败，请稍后再试。";
        }
        finally {
            sending = false;
            input.disabled = false;
            sendButton.disabled = false;
        }
    }
    function mount() {
        document.body.appendChild(host);
    }
    if (document.body)
        mount();
    else
        document.addEventListener("DOMContentLoaded", mount);
    function resolveApi(current) {
        var _a;
        const override = (_a = current === null || current === void 0 ? void 0 : current.dataset.api) === null || _a === void 0 ? void 0 : _a.trim();
        if (override) {
            const url = new URL(override, window.location.href);
            if (url.pathname === "/")
                url.pathname = "/api/chat";
            return url.toString();
        }
        if (current === null || current === void 0 ? void 0 : current.src)
            return new URL("/api/chat", current.src).toString();
        return new URL("/api/chat", window.location.href).toString();
    }
    function isChatResponse(value) {
        if (typeof value !== "object" || value === null)
            return false;
        const record = value;
        return typeof record.answer === "string" && typeof record.handoff === "boolean";
    }
    function readError(value) {
        if (typeof value === "object" && value !== null && "error" in value) {
            const error = value.error;
            if (typeof error === "string" && error)
                return error;
        }
        return "请求失败";
    }
    function escapeAttr(value) {
        return value.replace(/[&"'<>]/g, (char) => {
            var _a;
            const map = {
                "&": "&amp;",
                '"': "&quot;",
                "'": "&#39;",
                "<": "&lt;",
                ">": "&gt;",
            };
            return (_a = map[char]) !== null && _a !== void 0 ? _a : char;
        });
    }
})();
