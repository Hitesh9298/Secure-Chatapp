import React, { useState, useEffect, useRef } from "react";
import socketClient from "../socketClient";
import {
  deriveKey,
  encryptMessage,
  decryptMessage,
  generateRandomKey,
} from "../utils/cryptoUtils.js";
import {
  importPrivateKey,
  importPublicKey,
  encryptAESKeyWithPublicKey,
  decryptAESKeyWithPrivateKey,
} from "../utils/rsaUtils.js";
import TypingIndicator from "./TypingIndicator";
import MessageBubble from "./MessageBubble";
import { SendHorizonal, Smile, Hash, MessageCircle } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import axios from "axios";

export default function ChatRoom({ username, currentChat, onChatChange }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [roomAesKey, setRoomAesKey] = useState(null);
  const [privateKey, setPrivateKey] = useState(null);
  const [dmSessions, setDmSessions] = useState({});
  const [typingUsers, setTypingUsers] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const chatEndRef = useRef();
  const privateKeyRef = useRef(null);

  // Initialize encryption keys
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const privateKeyBase64 = localStorage.getItem("privateKey");
        if (privateKeyBase64) {
          const privKey = await importPrivateKey(privateKeyBase64);
          if (!isMounted) return;
          setPrivateKey(privKey);
          privateKeyRef.current = privKey;
          console.log("✅ RSA private key loaded");
        }

        const passphrase = "shared-room-secret";
        const fixedSalt = "fixed_salt_for_demo";
        const derived = await deriveKey(passphrase, fixedSalt);
        if (!isMounted) return;
        setRoomAesKey(derived);
        console.log("✅ Room AES key derived");

        socketClient.join(username);

        const handleRoomMessage = async (data) => {
          if (!isMounted) return;
          // REMOVED: if (data.sender === username) return;
          // Now we receive our own messages from the server

          try {
            const text = await decryptMessage(data, derived);
            setMessages((prev) => {
              // Check if message already exists to avoid duplicates
              const exists = prev.some(m => 
                m.sender === data.sender && 
                m.text === text && 
                m.type === "room" &&
                m.room === (data.room || "general") &&
                Math.abs(m.timestamp - Date.now()) < 1000
              );
              
              if (exists) return prev;
              
              return [
                ...prev,
                { 
                  sender: data.sender, 
                  text, 
                  type: "room", 
                  room: data.room || "general",
                  timestamp: Date.now() 
                },
              ];
            });
          } catch (err) {
            console.error("Room decryption failed:", err);
          }
        };

        const handleDirectMessage = async (data) => {
          if (!isMounted) return;
          const currentPrivateKey = privateKeyRef.current;

          if (!currentPrivateKey) {
            console.error("Private key not loaded yet");
            return;
          }

          try {
            const { sender, encryptedAESKey, encryptedMessage } = data;

            const sessionKey = await decryptAESKeyWithPrivateKey(
              new Uint8Array(encryptedAESKey),
              currentPrivateKey
            );

            setDmSessions((prev) => ({ ...prev, [sender]: sessionKey }));

            const text = await decryptMessage(encryptedMessage, sessionKey);

            setMessages((prev) => [
              ...prev,
              { sender, text, type: "dm", timestamp: Date.now() },
            ]);
          } catch (err) {
            console.error("DM decryption failed:", err);
          }
        };

        const handleTyping = (user) => {
          if (!isMounted) return;
          setTypingUsers((prev) => [...new Set([...prev, user])]);
        };

        const handleStopTyping = (user) => {
          if (!isMounted) return;
          setTypingUsers((prev) => prev.filter((u) => u !== user));
        };

        const handleTypingDM = (user) => {
          if (!isMounted) return;
          setTypingUsers((prev) => [...new Set([...prev, user])]);
        };

        const handleStopTypingDM = (user) => {
          if (!isMounted) return;
          setTypingUsers((prev) => prev.filter((u) => u !== user));
        };

        socketClient.onMessage(handleRoomMessage);
        socketClient.onDirectMessage(handleDirectMessage);
        socketClient.onTyping(handleTyping);
        socketClient.onStopTyping(handleStopTyping);
        socketClient.onTypingDM(handleTypingDM);
        socketClient.onStopTypingDM(handleStopTypingDM);
      } catch (err) {
        console.error("❌ Initialization error:", err);
        alert("Failed to initialize chat");
      }
    })();

    return () => {
      isMounted = false;
      socketClient.removeAllListeners();
      console.log("🧹 Cleaned up all socket listeners");
    };
  }, [username]);

  useEffect(() => {
    privateKeyRef.current = privateKey;
  }, [privateKey]);

  // Clear typing users when switching chats (but keep message history)
  useEffect(() => {
    setTypingUsers([]);
  }, [currentChat.type, currentChat.target]);

  const sendRoomMessage = async () => {
    if (!message.trim() || !roomAesKey) return;

    try {
      const enc = await encryptMessage(message, roomAesKey);
      const roomName = currentChat.target || "general";
      
      socketClient.sendMessage({
        room: roomName,
        sender: username,
        ciphertext: enc.ciphertext,
        iv: enc.iv,
      });

      // REMOVED: Don't add message locally, wait for server echo
      // This prevents duplicate messages
      setMessage("");
    } catch (err) {
      console.error("Error sending room message:", err);
    }
  };

  const sendDirectMessage = async (recipientUsername) => {
    if (!message.trim() || !privateKey) {
      if (!privateKey) {
        alert("⚠️ Private key not loaded. Please refresh and try again.");
      }
      return;
    }

    try {
      let sessionKey = dmSessions[recipientUsername];

      if (!sessionKey) {
        sessionKey = await generateRandomKey();
        setDmSessions((prev) => ({ ...prev, [recipientUsername]: sessionKey }));
      }

      const res = await axios.get(
        `http://localhost:5000/api/public-key/${recipientUsername}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      const recipientPublicKey = await importPublicKey(res.data.publicKey);

      const encryptedAESKey = await encryptAESKeyWithPublicKey(
        sessionKey,
        recipientPublicKey
      );

      const encryptedMessage = await encryptMessage(message, sessionKey);

      socketClient.sendDirectMessage({
        recipient: recipientUsername,
        sender: username,
        encryptedAESKey: Array.from(encryptedAESKey),
        encryptedMessage,
      });

      // Add DM to local state immediately (DMs don't echo back from server)
      setMessages((prev) => {
        // Check for duplicates
        const exists = prev.some(m => 
          m.sender === "You" && 
          m.text === message && 
          m.type === "dm" &&
          m.target === recipientUsername &&
          Math.abs(m.timestamp - Date.now()) < 1000
        );
        
        if (exists) return prev;
        
        return [
          ...prev,
          {
            sender: "You",
            text: message,
            type: "dm",
            target: recipientUsername,
            timestamp: Date.now(),
          },
        ];
      });
      setMessage("");
    } catch (err) {
      console.error("Error sending DM:", err);
      alert("Failed to send direct message. " + err.message);
    }
  };

  const handleSend = () => {
    if (currentChat.type === "room") {
      sendRoomMessage();
    } else {
      sendDirectMessage(currentChat.target);
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (currentChat.type === "room") {
      return m.type === "room" && m.room === currentChat.target;
    } else {
      return (
        m.type === "dm" &&
        (m.sender === currentChat.target || m.target === currentChat.target)
      );
    }
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filteredMessages]);

  const handleEmojiClick = (emojiData) => {
    setMessage((prev) => prev + emojiData.emoji);
  };

  const handleTyping = () => {
    if (currentChat.type === "room") {
      socketClient.typing(currentChat.target);
      clearTimeout(window.typingTimeout);
      window.typingTimeout = setTimeout(
        () => socketClient.stopTyping(currentChat.target),
        1000
      );
    } else {
      // For DMs, send typing indicator with target user
      socketClient.typingDM(currentChat.target);
      clearTimeout(window.typingTimeout);
      window.typingTimeout = setTimeout(
        () => socketClient.stopTypingDM(currentChat.target),
        1000
      );
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-gray-50 relative">
      {/* Chat Header */}
      <div className="bg-white border-b p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {currentChat.type === "room" ? (
            <>
              <div className="bg-blue-100 p-2 rounded-lg">
                <Hash className="text-blue-600" size={22} />
              </div>
              <div>
                <h2 className="font-bold text-xl tracking-tight text-gray-900">{currentChat.target}</h2>
                <p className="text-xs text-gray-500 font-medium">Group Chat • AES Encrypted</p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-green-100 p-2 rounded-lg">
                <MessageCircle className="text-green-600" size={22} />
              </div>
              <div>
                <h2 className="font-bold text-xl tracking-tight text-gray-900">{currentChat.target}</h2>
                <p className="text-xs text-gray-500 font-medium">Direct Message • End-to-End Encrypted</p>
              </div>
            </>
          )}
        </div>
        {currentChat.type === "dm" && (
          <button
            onClick={() => onChatChange({ type: "room", target: "general" })}
            className="text-sm font-semibold bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors"
          >
            ← Back to Room
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredMessages.length === 0 && (
          <div className="text-center text-gray-400 mt-10">
            <p className="text-lg font-medium">
              {currentChat.type === "room"
                ? "No messages yet. Start the conversation!"
                : `Start a private conversation with ${currentChat.target}`}
            </p>
          </div>
        )}
        {filteredMessages.map((m, i) => (
          <MessageBubble key={i} message={m} currentUsername={username} />
        ))}
        {typingUsers.length > 0 && (
          <TypingIndicator users={typingUsers} />
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex p-4 border-t bg-white items-center space-x-2 relative">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="text-gray-500 hover:text-gray-700 transition-colors p-2 hover:bg-gray-100 rounded-lg"
          title="Add emoji"
        >
          <Smile size={22} />
        </button>

        {showEmojiPicker && (
          <div className="absolute bottom-16 left-4 z-50 shadow-2xl rounded-lg">
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}

        <input
          className="flex-1 border border-gray-300 rounded-lg p-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-400"
          value={message}
          placeholder={
            currentChat.type === "room"
              ? "Type a message to the room..."
              : `Message ${currentChat.target}...`
          }
          onChange={(e) => {
            setMessage(e.target.value);
            handleTyping();
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />

        <button
          onClick={handleSend}
          disabled={!message.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg px-5 py-3 transition-all shadow-md hover:shadow-lg disabled:shadow-none"
          title="Send message"
        >
          <SendHorizonal size={20} />
        </button>
      </div>
    </div>
  );
}