import React, { useState, useEffect, useRef } from "react";
import "./App.css";

const WEBSOCKET_URL = "wss://backend-chatapp-production-8467.up.railway.app";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [typingUser, setTypingUser] = useState("");

  const ws = useRef(null);
  const messagesEndRef = useRef(null);
  const clientId = useRef(Math.random().toString(36).substring(2, 9));

  useEffect(() => {
    ws.current = new WebSocket(WEBSOCKET_URL);

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // typing event
      if (data.type === "typing") {
        if (data.clientId !== clientId.current) {
          setTypingUser(data.username);
          setTimeout(() => setTypingUser(""), 1500);
        }
        return;
      }

      // delete event
      if (data.type === "delete") {
        setMessages((prev) => prev.filter((m) => m.id !== data.id));
        return;
      }

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
      id: Date.now(),
      message: input,
      username,
      clientId: clientId.current,
      time: new Date().toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      })
    };

    ws.current.send(JSON.stringify(data));
    setInput("");
  };

  const deleteMessage = (id) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));

    ws.current.send(
      JSON.stringify({
        type: "delete",
        id
      })
    );
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      ws.current.send(
        JSON.stringify({
          type: "file",
          id: Date.now(),
          file: reader.result,
          fileType: file.type,
          username,
          clientId: clientId.current,
          time: new Date().toLocaleTimeString()
        })
      );
    };

    reader.readAsDataURL(file);
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
                  <img src={msg.file} alt="" width="200" />
                ) : msg.fileType.startsWith("video") ? (
                  <video src={msg.file} controls width="200" />
                ) : msg.fileType.startsWith("audio") ? (
                  <audio src={msg.file} controls />
                ) : null
              ) : (
                <div>{msg.message}</div>
              )}

              <div className="msg-time">{msg.time}</div>

              {msg.senderType === "you" && (
                <button onClick={() => deleteMessage(msg.id)}>Delete</button>
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {typingUser && (
        <div style={{ paddingLeft: "15px" }}>{typingUser} is typing...</div>
      )}

      <div className="chat-input">
        <input
          value={input}
          placeholder="Type message..."
          onChange={(e) => {
            setInput(e.target.value);

            ws.current.send(
              JSON.stringify({
                type: "typing",
                username,
                clientId: clientId.current
              })
            );
          }}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />

        <input type="file" onChange={handleFile} />

        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default App;
