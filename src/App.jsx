// App.jsx
import React, { useState, useEffect, useRef } from "react";
import "./App.css"; // We'll use this for styling

const WEBSOCKET_URL = "wss://backend-chatapp-production-8467.up.railway.app";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const ws = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket(WEBSOCKET_URL);

    ws.current.onopen = () => console.log("Connected to WebSocket server");

    ws.current.onmessage = (event) => {
      setMessages((prev) => [...prev, { text: event.data, sender: "other" }]);
    };

    ws.current.onclose = () => console.log("Disconnected from WebSocket server");

    return () => ws.current.close();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (input.trim() === "") return;

    ws.current.send(JSON.stringify({ message: input }));
    setMessages((prev) => [...prev, { text: input, sender: "you" }]);
    setInput("");
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h2>ChatApp</h2>
      </header>

      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`chat-message ${msg.sender === "you" ? "you" : "other"}`}
          >
            {msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default App;
