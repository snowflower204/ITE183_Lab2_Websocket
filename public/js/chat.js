"use strict";

    const statusText = document.getElementById("status");
    const input = document.getElementById("message");
    const button = document.getElementById("sendButton");
    const messages = document.getElementById("messages");
    const form = document.getElementById("chatForm");
    const scroller = document.getElementById("messageScroll");
    const emptyState = document.getElementById("emptyState");
    const hint = document.getElementById("connectionHint");
    const reconnectButton = document.getElementById("reconnectButton");
    const newMessagesButton = document.getElementById("newMessagesButton");
    const demoRole = document.getElementById("demoRole");
    const rolePreview = document.getElementById("rolePreview");
    const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
    let socket = null;
    let connectionState = "connecting";
    let connectionFailed = false;
    let composing = false;

    function updateSendButton() {
      button.disabled = connectionState !== "connected" || !socket || socket.readyState !== WebSocket.OPEN || !input.value.trim();
    }

    function setConnectionState(state, explanation) {
      connectionState = state;
      statusText.dataset.state = state;
      statusText.textContent = { connecting: "Connecting", connected: "Connected", disconnected: "Disconnected", error: "Connection error" }[state];
      hint.textContent = explanation;
      input.disabled = state !== "connected";
      reconnectButton.hidden = state === "connected" || state === "connecting";
      updateSendButton();
    }

    function nearBottom() {
      return scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop < 72;
    }

    function scrollToLatest() {
      scroller.scrollTop = scroller.scrollHeight;
      newMessagesButton.hidden = true;
    }

    function appendMessage(text) {
      const followLatest = nearBottom();
      const receivedAt = new Date();
      const item = document.createElement("li");
      const time = document.createElement("time");
      time.dateTime = receivedAt.toISOString();
      time.textContent = timeFormat.format(receivedAt);
      time.title = "Received on this device: " + receivedAt.toLocaleString();
      time.setAttribute("aria-label", "Received on this device at " + receivedAt.toLocaleString());

      // app.bzg sends this exact greeting only to a newly connected client.
      if (text === "Welcome to EcoNite!") {
        item.className = "system-message";
        const greeting = document.createElement("span");
        greeting.textContent = text;
        item.append(greeting, time);
      } else {
        emptyState.hidden = true;
        item.className = "message";
        const meta = document.createElement("div");
        meta.className = "message-meta";
        const label = document.createElement("span");
        label.className = "message-label";
        label.textContent = "Shared room";
        meta.append(label, time);
        const bubble = document.createElement("p");
        bubble.className = "message-bubble";
        // Preserve complete broadcasts: no identity guesses or HTML parsing.
        bubble.textContent = text;
        item.append(meta, bubble);
      }

      messages.appendChild(item);
      if (followLatest) scrollToLatest();
      else newMessagesButton.hidden = false;
    }

    function connect() {
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;
      connectionFailed = false;
      setConnectionState("connecting", "Connecting to the shared room…");
      const protocol = location.protocol === "https:" ? "wss:" : "ws:";
      let currentSocket;
      try {
        currentSocket = new WebSocket(protocol + "//" + location.host);
        socket = currentSocket;
      } catch (error) {
        setConnectionState("error", "Unable to connect. Check that the lab server is running, then reconnect.");
        return;
      }

      currentSocket.onopen = function () {
        if (socket !== currentSocket) return;
        setConnectionState("connected", "Messages are shared with everyone in this room.");
      };
      currentSocket.onmessage = function (event) {
        if (socket !== currentSocket) return;
        appendMessage(event.data);
      };
      currentSocket.onclose = function () {
        if (socket !== currentSocket) return;
        setConnectionState("disconnected", connectionFailed
          ? "Connection failed. Check the lab server, then reconnect."
          : "Disconnected. Your draft is kept here; reconnect to send.");
      };
      currentSocket.onerror = function () {
        if (socket !== currentSocket) return;
        connectionFailed = true;
        setConnectionState("error", "Connection error. Check the lab server, then reconnect.");
      };
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (composing) return;
      const text = input.value.trim();
      if (!text || connectionState !== "connected" || !socket || socket.readyState !== WebSocket.OPEN) {
        updateSendButton();
        return;
      }
      try {
        // Roles stay local; the original plain-text wire protocol is unchanged.
        socket.send(text);
        input.value = "";
        updateSendButton();
        input.focus();
        scrollToLatest();
      } catch (error) {
        connectionFailed = true;
        setConnectionState("error", "Your message could not be sent. Your draft is kept here; reconnect to try again.");
        socket.close();
      }
    });

    input.addEventListener("input", updateSendButton);
    input.addEventListener("compositionstart", function () { composing = true; });
    input.addEventListener("compositionend", function () { composing = false; });
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && (event.isComposing || composing || event.keyCode === 229)) event.preventDefault();
    });
    reconnectButton.addEventListener("click", connect);
    newMessagesButton.addEventListener("click", scrollToLatest);
    scroller.addEventListener("scroll", function () { if (nearBottom()) newMessagesButton.hidden = true; });
    demoRole.addEventListener("change", function () {
      rolePreview.textContent = demoRole.value + " preview · demo only";
    });

    // A homepage choice is context only; never send it as an identity or payload.
    const topicNames = new Map([
      ["research", "Research & Academic Projects"],
      ["capstone", "Capstone Development"],
      ["ai", "AI & Machine Learning"],
      ["iot", "IoT & Emerging Technologies"]
    ]);
    const selectedTopic = topicNames.get(new URLSearchParams(location.search).get("topic"));
    if (selectedTopic) {
      const topicContext = document.getElementById("topicContext");
      topicContext.textContent = "Conversation topic: " + selectedTopic + " · local selection";
      topicContext.hidden = false;
    }

    connect();
