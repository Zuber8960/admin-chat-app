import { useRef, useState } from "react";

export default function ChatWindow({ title, messages, selfUserId, onSend, disabled }) {
  const [text, setText] = useState("");
  const listRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText("");
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  };

  return (
    <div className="panel">
      <h3>{title}</h3>
      <div className="chat-list" ref={listRef}>
        {messages.length === 0 && <p className="muted">No messages yet.</p>}
        {messages.map((m, idx) => (
          <div
            key={`${m.ts}-${idx}`}
            className={m.fromUserId === selfUserId ? "msg me" : "msg"}
          >
            <span>{m.message}</span>
          </div>
        ))}
      </div>
      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={disabled ? "Admin offline" : "Type a message"}
          disabled={disabled}
        />
        <button className="primary" type="submit" disabled={disabled}>
          Send
        </button>
      </form>
    </div>
  );
}
