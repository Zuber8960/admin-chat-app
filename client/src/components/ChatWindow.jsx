import { useRef, useState } from "react";

export default function ChatWindow({ title, messages, selfUserId, onSend, disabled }) {
  const [text, setText] = useState("");
  const listRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojis = [
    "\u{1F600}",
    "\u{1F602}",
    "\u{1F60D}",
    "\u{1F44D}",
    "\u{1F389}",
    "\u{1F64F}",
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend({ type: "text", text });
    setText("");
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  };

  const handleEmoji = (emoji) => {
    if (disabled) return;
    setText((prev) => `${prev}${emoji}`);
  };

  const handlePickFile = () => {
    if (disabled || !fileInputRef.current) return;
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onSend({ type: "image", dataUrl: reader.result, name: file.name });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const renderMessage = (m) => {
    if (m.message?.type === "image") {
      return (
        <div className="msg-media">
          <img src={m.message.dataUrl} alt={m.message.name || "image"} />
        </div>
      );
    }
    const textValue = m.message?.text ?? m.message ?? "";
    return <span>{textValue}</span>;
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
            {renderMessage(m)}
          </div>
        ))}
      </div>
      <div className="emoji-row">
        {emojis.map((emoji) => (
          <button key={emoji} className="emoji-btn" onClick={() => handleEmoji(emoji)}>
            {emoji}
          </button>
        ))}
        <button className="emoji-btn" onClick={handlePickFile} disabled={disabled}>
          {"\u{1F4F7}"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="file-input"
          onChange={handleFileChange}
          disabled={disabled}
        />
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
