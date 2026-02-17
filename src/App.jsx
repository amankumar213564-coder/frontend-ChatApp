import React, { useEffect, useRef, useState } from "react";
import "./App.css";

// 🔴 IMPORTANT: Change this based on where your backend is running:
// Local: ws://localhost:8000
// Production: wss://your-railway-backend.railway.app
// const WEBSOCKET_URL = "ws://localhost:8000";
// // Get this from Railway dashboard
// const WEBSOCKET_URL = "wss://backend-chatapp-production-8467.up.railway.app";
const WEBSOCKET_URL = "https:wss://backend-chatapp-production-8467.up.railway.app";

function App() {
  const [joined, setJoined] = useState(false);
  const [username, setUsername] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [fileData, setFileData] = useState(null);
  const [typingUser, setTypingUser] = useState("");
  const [onlineCount, setOnlineCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState("connecting");

  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const clientIdRef = useRef(Math.random().toString(36).slice(2));
  const typingTimeoutRef = useRef(null);

  /* ==================== WEBSOCKET CONNECTION ==================== */
  useEffect(() => {
    if (!joined) return;

    console.log("🔌 Attempting to connect to WebSocket...");
    console.log("📍 URL:", WEBSOCKET_URL);
    setConnectionStatus("connecting");

    wsRef.current = new WebSocket(WEBSOCKET_URL);

    wsRef.current.onopen = () => {
      console.log("✅ WebSocket connected");
      setConnectionStatus("connected");

      wsRef.current.send(
        JSON.stringify({
          type: "join",
          username,
          clientId: clientIdRef.current,
        }),
      );
      console.log(`✅ Sent join message for: ${username}`);
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "history") {
          console.log(`📨 Received ${data.messages.length} message history`);
          setMessages(
            data.messages.map((m) => ({
              ...m,
              senderType: m.clientId === clientIdRef.current ? "you" : "other",
            })),
          );
          return;
        }

        if (data.type === "users") {
          console.log(`👥 Online users: ${data.count}`);
          setOnlineCount(data.count);
          return;
        }

        if (data.type === "typing") {
          if (data.clientId !== clientIdRef.current) {
            setTypingUser(data.username);
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
            }
            typingTimeoutRef.current = setTimeout(() => {
              setTypingUser("");
            }, 1500);
          }
          return;
        }

        if (data.type === "delivered" || data.type === "seen") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === data.id ? { ...m, status: data.type } : m,
            ),
          );
          return;
        }

        if (data.type === "message" || data.type === "file") {
          const senderType =
            data.clientId === clientIdRef.current ? "you" : "other";

          if (senderType === "other") {
            wsRef.current.send(
              JSON.stringify({ type: "delivered", id: data.id }),
            );
          }

          setMessages((prev) => [...prev, { ...data, senderType }]);
          return;
        }
      } catch (err) {
        console.error("Error parsing message:", err);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
      setConnectionStatus("disconnected");
    };

    wsRef.current.onclose = () => {
      console.log("❌ WebSocket disconnected");
      setConnectionStatus("disconnected");
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [joined, username]);

  /* ==================== SCROLL TO BOTTOM + SEND SEEN ==================== */
  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 0);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      messages.forEach((m) => {
        if (m.senderType === "other" && m.status !== "seen") {
          wsRef.current.send(JSON.stringify({ type: "seen", id: m.id }));
        }
      });
    }
  }, [messages]);

  /* ==================== JOIN CHAT ==================== */
  const joinChat = () => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      alert("Please enter a name");
      return;
    }
    setJoined(true);
  };

  /* ==================== FILE SELECT ==================== */
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("File size must be less than 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFileData({
        file: reader.result,
        fileType: file.type,
        fileName: file.name,
      });
      console.log(`📎 File selected: ${file.name}`);
    };
    reader.onerror = () => {
      alert("Error reading file");
    };
    reader.readAsDataURL(file);
  };

  /* ==================== SEND MESSAGE ==================== */
  const sendMessage = () => {
    if (connectionStatus !== "connected") {
      alert("Not connected to server. Please wait...");
      return;
    }

    const messageText = input.trim();

    if (!messageText && !fileData) {
      return;
    }

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      alert("Connection lost. Please refresh the page.");
      return;
    }

    const payload = {
      id: Date.now(),
      clientId: clientIdRef.current,
      username,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "sent",
    };

    if (fileData) {
      payload.type = "file";
      payload.file = fileData.file;
      payload.fileType = fileData.fileType;
      payload.fileName = fileData.fileName;
    } else {
      payload.type = "message";
      payload.message = messageText;
    }

    try {
      console.log(`📤 Sending ${payload.type}...`);
      wsRef.current.send(JSON.stringify(payload));
      console.log(`✅ ${payload.type} sent!`);

      setInput("");
      setFileData(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Failed to send message");
    }
  };

  /* ==================== HANDLE TYPING ==================== */
  const handleTyping = (e) => {
    setInput(e.target.value);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "typing",
          username,
          clientId: clientIdRef.current,
        }),
      );
    }
  };

  /* ==================== JOIN SCREEN ==================== */
  if (!joined) {
    return (
      <div className="join-screen">
        <div className="join-card">
          <div className="join-header">
            <div className="join-icon">💬</div>
            <h1>ChatApp</h1>
          </div>

          <h2>Welcome!</h2>
          <p>Enter your name to join the chat</p>

          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your name"
            maxLength="30"
            onKeyDown={(e) => e.key === "Enter" && joinChat()}
            autoFocus
          />

          <button onClick={joinChat} disabled={!username.trim()}>
            Join Chat
          </button>
        </div>
      </div>
    );
  }

  /* ==================== CHAT SCREEN ==================== */
  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-left">
          <h1 className="header-title">ChatApp</h1>
          <span className="header-subtitle">
            {onlineCount} online
            {connectionStatus === "connected" ? " 🟢" : " 🔴"}
          </span>
        </div>
      </div>

      <div className="chat-body">
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <p>No messages yet. Start a conversation!</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`chat-row ${msg.senderType}`}>
              <div className="chat-message">
                <div className="msg-username">{msg.username}</div>

                {msg.type === "file" ? (
                  msg.fileType?.startsWith("image") ? (
                    <img src={msg.file} alt={msg.fileName || "Image"} />
                  ) : msg.fileType?.startsWith("video") ? (
                    <video src={msg.file} controls />
                  ) : msg.fileType?.startsWith("audio") ? (
                    <audio src={msg.file} controls />
                  ) : (
                    <div className="file-msg">📎 {msg.fileName || "File"}</div>
                  )
                ) : (
                  <div className="msg-text">{msg.message}</div>
                )}

                <div className="msg-time">
                  {msg.time}
                  {msg.senderType === "you" && (
                    <span className={`tick ${msg.status}`}>
                      {msg.status === "sent" && " ✓"}
                      {msg.status === "delivered" && " ✓✓"}
                      {msg.status === "seen" && " ✓✓"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {typingUser && (
        <div className="typing-indicator">
          <span className="typing-text">{typingUser} is typing</span>
          <span className="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </div>
      )}

      {fileData && (
        <div className="file-preview">
          <div className="preview-item">
            {fileData.fileType?.startsWith("image") ? (
              <img src={fileData.file} alt="preview" className="preview-img" />
            ) : fileData.fileType?.startsWith("video") ? (
              <video src={fileData.file} className="preview-video" />
            ) : (
              <div className="preview-file">📄</div>
            )}
            <div className="preview-info">
              <span className="preview-name">{fileData.fileName}</span>
              <button
                className="preview-remove"
                onClick={() => {
                  setFileData(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="chat-input-container">
        <div className="chat-input">
          <label
            htmlFor="file-input"
            className="file-button"
            title="Attach file"
          >
            📎
          </label>
          <input
            id="file-input"
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept="image/*,video/*,audio/*"
          />

          <input
            type="text"
            value={input}
            placeholder="Type a message..."
            onChange={handleTyping}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            disabled={connectionStatus !== "connected"}
          />

          <button
            className="send-button"
            onClick={sendMessage}
            disabled={
              connectionStatus !== "connected" || (!input.trim() && !fileData)
            }
            title="Send message"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
