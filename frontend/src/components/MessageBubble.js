import React from "react";

export default function MessageBubble({ message, currentUsername }) {
  const isOwnMessage = message.sender === currentUsername || message.sender === "You";
  
  return (
    <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} mb-3`}>
      <div className={`max-w-md ${isOwnMessage ? "order-2" : "order-1"}`}>
        {!isOwnMessage && (
          <div className="text-xs font-semibold text-gray-600 mb-1 ml-1">
            {message.sender}
          </div>
        )}
        <div
          className={`rounded-2xl px-4 py-3 shadow-sm ${
            isOwnMessage
              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-sm"
              : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
          }`}
        >
          <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
            {message.text}
          </p>
          <div
            className={`text-xs mt-1 ${
              isOwnMessage ? "text-blue-100" : "text-gray-400"
            }`}
          >
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
    </div>
  );
}