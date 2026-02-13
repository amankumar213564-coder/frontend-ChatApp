import React, { useEffect, useRef, useState } from "react";
import "./App.css";

const WEBSOCKET_URL = "wss://backend-chatapp-production-8467.up.railway.app";

function App() {
  const [joined, setJoined] = useState(false);
  const [username, setUsername] = useState("");

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [fileData, setFileData] = useState(null);

  const [typingUser, setTypingUser] = useState("");
  const [onlineCount, setOnlineCount] = useState(0);

  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const clientIdRef = useRef(Math.random().toString(36).slice(2));

  /* -------------------- WEBSOCKET -------------------- */
  useEffect(() => {
    wsRef.current = new WebSocket(WEBSOCKET_URL);

    wsRef.current.onopen = () => {
      wsRef.current.send(
        JSON.stringify({
          type: "join",
          username,
          clientId: clientIdRef.current
        })
      );
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      /* ONLINE USERS */
      if (data.type === "users") {
        setOnlineCount(data.count);
        return;
      }

      /* TYPING */
      if (data.type === "typing") {
        if (data.clientId !== clientIdRef.current) {
          setTypingUser(data.username);
          setTimeout(() => setTypingUser(""), 1500);
        }
        return;
      }

      /* DELIVERED */
      if (data.type === "delivered") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.id ? { ...m, status: "delivered" } : m
          )
        );
        return;
      }

      /* SEEN */
      if (data.type === "seen") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.id ? { ...m, status: "seen" } : m
          )
        );
        return;
      }

      /* MESSAGE / FILE */
      const senderType =
        data.clientId === clientIdRef.current ? "you" : "other";

      if (senderType === "other") {
        wsRef.current.send(
          JSON.stringify({ type: "delivered", id: data.id })
        );
      }

      setMessages((prev) => [...prev, { ...data, senderType }]);
    };

    return () => wsRef.current?.close();
  }, [username]);

  /* -------------------- SCROLL + SEEN -------------------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

    messages.forEach((m) => {
      if (m.senderType === "other") {
        wsRef.current.send(
          JSON.stringify({ type: "seen", id: m.id })
        );
      }
    });
  }, [messages]);

  /* -------------------- JOIN -------------------- */
  const joinChat = () => {
    if (!username.trim()) return;
    setJoined(true);
  };

  /* -------------------- FILE SELECT -------------------- */
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFileData({
        file: reader.result,
        fileType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  /* -------------------- SEND -------------------- */
  const sendMessage = () => {
    if (!input.trim() && !fileData) return;

    const payload = {
      id: Date.now(),
      clientId: clientIdRef.current,
      username,
      time: new Date().toLocaleTimeString(),
      status: "sent"
    };

    if (fileData) {
      payload.type = "file";
      payload.file = fileData.file;
      payload.fileType = fileData.fileType;
    } else {
      payload.type = "message";
      payload.message = input;
    }

    wsRef.current.send(JSON.stringify(payload));

    setInput("");
    setFileData(null);
  };

  /* -------------------- JOIN SCREEN -------------------- */
  if (!joined) {
    return (
      <div className="join-screen">
        <div className="join-card">
          <h2>Enter your name</h2>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your name"
          />
          <button onClick={joinChat}>Join Chat</button>
        </div>
      </div>
    );
  }

  /* -------------------- CHAT UI -------------------- */
  return (
    <div className="chat-container">
      {/* HEADER */}
      <div className="chat-header">
        <div className="header-title">Live Chat</div>
        <div className="header-status">{onlineCount} online</div>
      </div>

      {/* BODY */}
      <div className="chat-body">
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-row ${msg.senderType}`}>
              <div className="chat-message">
                <div className="msg-username">{msg.username}</div>

                {msg.type === "file" ? (
                  msg.fileType?.startsWith("image") ? (
                    <img src={msg.file} alt="" />
                  ) : msg.fileType?.startsWith("video") ? (
                    <video src={msg.file} controls />
                  ) : (
                    <audio src={msg.file} controls />
                  )
                ) : (
                  <div>{msg.message}</div>
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

      {/* TYPING */}
      {typingUser && (
        <div className="typing-indicator">
          {typingUser} is typing...
        </div>
      )}

      {/* INPUT */}
      <div className="chat-input">
        <input
          type="text"
          value={input}
          placeholder="Type a message"
          onChange={(e) => {
            setInput(e.target.value);
            wsRef.current.send(
              JSON.stringify({
                type: "typing",
                username,
                clientId: clientIdRef.current
              })
            );
          }}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <input type="file" onChange={handleFileSelect} />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default App;
