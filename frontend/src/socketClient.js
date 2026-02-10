import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

const socketClient = {
  socket,

  join: (username) => {
    socket.emit("join", username);
  },

  joinRoom: (roomName) => {
    socket.emit("joinRoom", roomName);
  },

  leaveRoom: (roomName) => {
    socket.emit("leaveRoom", roomName);
  },

  sendMessage: (data) => {
    socket.emit("message", data);
  },

  sendDirectMessage: (data) => {
    socket.emit("directMessage", data);
  },

  onMessage: (callback) => {
    socket.off("message");
    socket.on("message", callback);
  },

  onDirectMessage: (callback) => {
    socket.off("directMessage");
    socket.on("directMessage", callback);
  },

  // Room typing indicators
  typing: (room) => {
    socket.emit("typing", room);
  },

  stopTyping: (room) => {
    socket.emit("stopTyping", room);
  },

  // DM typing indicators (NEW)
  typingDM: (targetUser) => {
    socket.emit("typingDM", targetUser);
  },

  stopTypingDM: (targetUser) => {
    socket.emit("stopTypingDM", targetUser);
  },

  onTyping: (callback) => {
    socket.off("typing");
    socket.on("typing", callback);
  },

  onStopTyping: (callback) => {
    socket.off("stopTyping");
    socket.on("stopTyping", callback);
  },

  // DM typing listeners (NEW)
  onTypingDM: (callback) => {
    socket.off("typingDM");
    socket.on("typingDM", callback);
  },

  onStopTypingDM: (callback) => {
    socket.off("stopTypingDM");
    socket.on("stopTypingDM", callback);
  },

  onUserList: (callback) => {
    socket.off("userList");
    socket.on("userList", callback);
  },

  offUserList: () => {
    socket.off("userList");
  },

  onRoomCreated: (callback) => {
    socket.off("roomCreated");
    socket.on("roomCreated", callback);
  },

  onRoomDeleted: (callback) => {
    socket.off("roomDeleted");
    socket.on("roomDeleted", callback);
  },

  onUserJoinedRoom: (callback) => {
    socket.off("userJoinedRoom");
    socket.on("userJoinedRoom", callback);
  },

  onUserLeftRoom: (callback) => {
    socket.off("userLeftRoom");
    socket.on("userLeftRoom", callback);
  },

  removeAllListeners: () => {
    socket.off("message");
    socket.off("directMessage");
    socket.off("typing");
    socket.off("stopTyping");
    socket.off("typingDM");
    socket.off("stopTypingDM");
    socket.off("userList");
    socket.off("roomCreated");
    socket.off("roomDeleted");
    socket.off("userJoinedRoom");
    socket.off("userLeftRoom");
  },

  disconnect: () => {
    socket.disconnect();
  },
};

export default socketClient;