import React, { useState, useEffect, useRef } from "react";
import "./App.css";

const WEBSOCKET_URL = "wss://backend-chatapp-production-8467.up.railway.app";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [fileData, setFileData] = useState(null);
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);

  const ws = useRef(null);
  const messagesEndRef = useRef(null);
  const clientId = useRef(Math.random().toString(36).substring(2, 9));

  useEffect(() => {
    ws.current = new WebSocket(WEBSOCKET_URL);

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.clientId === clientId.current) {
        data.senderType = "you";
      } else {
        data.senderType = "other";
      }

      setMessages((prev) => [...prev, data]);
    };

    return () => ws.current.close();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const joinChat = () => {
    if (!username.trim()) return;
    setJoined(true);
  };

  /* FILE SELECT */
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

  /* SEND MESSAGE OR FILE */
  const sendMessage = () => {
    if (!input.trim() && !fileData) return;

    const data = {
      id: Date.now(),
      username,
      clientId: clientId.current,
      time: new Date().toLocaleTimeString()
    };

    if (fileData) {
      data.type = "file";
      data.file = fileData.file;
      data.fileType = fileData.fileType;
    } else {
      data.type = "message";
      data.message = input;
    }

    ws.current.send(JSON.stringify(data));

    setInput("");
    setFileData(null);
  };

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

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h2>Live Chat</h2>
      </header>

      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`chat-row ${msg.senderType}`}>
            <div className="chat-message">
              <div className="msg-username">{msg.username}</div>

              {msg.type === "file" ? (
                msg.fileType.startsWith("image") ? (
                  <img src={msg.file} alt="" />
                ) : msg.fileType.startsWith("video") ? (
                  <video src={msg.file} controls />
                ) : msg.fileType.startsWith("audio") ? (
                  <audio src={msg.file} controls />
                ) : null
              ) : (
                <div>{msg.message}</div>
              )}

              <div className="msg-time">{msg.time}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <input
          value={input}
          placeholder="Type message..."
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />

        <input type="file" onChange={handleFileSelect} />

        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default App;
