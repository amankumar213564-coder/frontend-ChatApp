import React, { useState, useEffect, useRef } from "react";
import "./App.css";

const WEBSOCKET_URL = "wss://backend-chatapp-production-8467.up.railway.app";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
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

  const sendMessage = () => {
    if (!input.trim()) return;

    const data = {
      message: input,
      username: username,
      clientId: clientId.current,
      time: new Date().toLocaleString("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true
})

    };

    ws.current.send(JSON.stringify(data));
    setInput("");
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
      <div>{msg.message}</div>
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
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default App;
