import React, { useState, useEffect } from "react";
import socketClient from "../socketClient";
import axios from "axios";
import { 
  Users, 
  MessageCircle, 
  Hash, 
  LogOut, 
  Shield, 
  Lock, 
  Plus,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  Info,
  Loader,
} from "lucide-react";

// Toast Notification Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle size={20} className="text-green-500" />,
    error: <AlertCircle size={20} className="text-red-500" />,
    info: <Info size={20} className="text-blue-500" />,
  };

  const bgColors = {
    success: "bg-green-50 border-green-200",
    error: "bg-red-50 border-red-200",
    info: "bg-blue-50 border-blue-200",
  };

  return (
    <div className={`fixed top-4 right-4 z-50 ${bgColors[type]} border rounded-lg shadow-lg p-4 flex items-start gap-3 max-w-md animate-slide-in`}>
      {icons[type]}
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{message}</p>
      </div>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
        <X size={18} />
      </button>
    </div>
  );
};

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="flex items-center gap-2">
    <Loader size={16} className="animate-spin" />
    <span>Creating...</span>
  </div>
);

export default function Sidebar({ username, onLogout, currentChat, onChatChange }) {
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDesc, setNewRoomDesc] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    socketClient.onUserList((userList) => {
      setUsers(userList);
    });

    loadRooms();

    socketClient.socket.on("roomCreated", (room) => {
      console.log("🆕 New room created:", room);
      setRooms((prev) => {
        if (prev.some(r => r.name === room.name)) {
          return prev;
        }
        return [...prev, room];
      });
    });

    socketClient.socket.on("roomDeleted", ({ room }) => {
      console.log("🗑️ Room deleted:", room);
      setRooms((prev) => prev.filter((r) => r.name !== room));
      
      if (currentChat.type === "room" && currentChat.target === room) {
        onChatChange({ type: "room", target: "general" });
      }
      
      showToast(`Room #${room} has been deleted`, "info");
    });

    socketClient.socket.on("userJoinedRoom", ({ room, username: joinedUser, members }) => {
      console.log("👤 User joined room:", { room, joinedUser });
      setRooms((prev) =>
        prev.map((r) => (r.name === room ? { ...r, members, memberCount: members.length } : r))
      );
    });

    socketClient.socket.on("userLeftRoom", ({ room, username: leftUser, members }) => {
      console.log("🚪 User left room:", { room, leftUser });
      setRooms((prev) =>
        prev.map((r) => (r.name === room ? { ...r, members, memberCount: members.length } : r))
      );
    });

    socketClient.socket.on("addedToRoom", ({ roomName, addedBy, description }) => {
      console.log(`🎉 Added to room ${roomName} by ${addedBy}`);
      
      showToast(`${addedBy} added you to #${roomName}`, "success");
      
      // Auto-switch to the new room after 1 second
      setTimeout(() => {
        onChatChange({ type: "room", target: roomName });
      }, 1000);
      
      loadRooms();
    });

    return () => {
      socketClient.offUserList();
      socketClient.socket.off("roomCreated");
      socketClient.socket.off("roomDeleted");
      socketClient.socket.off("userJoinedRoom");
      socketClient.socket.off("userLeftRoom");
      socketClient.socket.off("addedToRoom");
    };
  }, [currentChat, onChatChange]);

  const loadRooms = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:5000/api/rooms", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const allRooms = [
        { 
          name: "general", 
          description: "Default team channel", 
          members: [username],
          createdBy: "system",
          memberCount: 1,
        },
        ...res.data.rooms
      ];
      
      setRooms(allRooms);
      console.log("✅ Loaded rooms:", allRooms.length);
    } catch (err) {
      console.error("❌ Error loading rooms:", err);
      showToast("Failed to load rooms", "error");
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim() || loading) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const allMembers = [...new Set([username, ...selectedMembers])];
      
      const res = await axios.post(
        "http://localhost:5000/api/rooms",
        { 
          name: newRoomName.trim(), 
          description: newRoomDesc.trim(),
          members: allMembers
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("✅ Room created:", res.data.room);

      socketClient.socket.emit("joinRoom", res.data.room.name);
      onChatChange({ type: "room", target: res.data.room.name });

      showToast(`Room #${res.data.room.name} created successfully!`, "success");

      setNewRoomName("");
      setNewRoomDesc("");
      setSelectedMembers([]);
      setShowCreateRoom(false);
    } catch (err) {
      console.error("❌ Error creating room:", err);
      showToast(err.response?.data?.error || "Failed to create room", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (roomName) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `http://localhost:5000/api/rooms/${roomName}/join`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("✅ Joined room:", roomName);

      socketClient.socket.emit("joinRoom", roomName);
      loadRooms();
      onChatChange({ type: "room", target: roomName });
      
      showToast(`Joined #${roomName} successfully!`, "success");
    } catch (err) {
      console.error("❌ Error joining room:", err);
      showToast(err.response?.data?.error || "Failed to join room", "error");
    }
  };

  const handleLeaveRoom = async (roomName) => {
    if (roomName === "general") {
      showToast("Cannot leave the general room", "error");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `http://localhost:5000/api/rooms/${roomName}/leave`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("✅ Left room:", roomName);

      socketClient.socket.emit("leaveRoom", roomName);

      if (currentChat.type === "room" && currentChat.target === roomName) {
        onChatChange({ type: "room", target: "general" });
      }

      loadRooms();
      showToast(`Left #${roomName}`, "info");
    } catch (err) {
      console.error("❌ Error leaving room:", err);
      showToast(err.response?.data?.error || "Failed to leave room", "error");
    }
  };

  const handleDeleteRoom = async (roomName, createdBy) => {
    if (roomName === "general") {
      showToast("Cannot delete the general room", "error");
      return;
    }

    if (createdBy !== username) {
      showToast("Only the room creator can delete this room", "error");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete #${roomName}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/api/rooms/${roomName}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("✅ Deleted room:", roomName);
      showToast(`Deleted #${roomName}`, "success");
    } catch (err) {
      console.error("❌ Error deleting room:", err);
      showToast(err.response?.data?.error || "Failed to delete room", "error");
    }
  };

  const handleRoomClick = (roomName) => {
    const room = rooms.find((r) => r.name === roomName);
    
    if (room && !room.members.includes(username) && roomName !== "general") {
      handleJoinRoom(roomName);
      return;
    }

    onChatChange({ type: "room", target: roomName });
  };

  const handleUserClick = (user) => {
    onChatChange({ type: "dm", target: user });
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserColor = (name) => {
    const colors = [
      "from-blue-500 to-blue-600",
      "from-purple-500 to-purple-600",
      "from-pink-500 to-pink-600",
      "from-emerald-500 to-emerald-600",
      "from-yellow-500 to-yellow-600",
      "from-orange-500 to-orange-600",
      "from-indigo-500 to-indigo-600",
      "from-cyan-500 to-cyan-600",
    ];
    const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  const otherUsers = users.filter((user) => user !== username);

  const toggleMemberSelection = (user) => {
    setSelectedMembers((prev) => {
      if (prev.includes(user)) {
        return prev.filter((u) => u !== user);
      } else {
        return [...prev, user];
      }
    });
  };

  return (
    <div className="w-80 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col shadow-2xl relative">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {/* Header Section */}
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Shield className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">SecureChat</h2>
            <p className="text-xs text-gray-400 font-medium">Enterprise Edition</p>
          </div>
        </div>
        
        {/* User Info Card */}
        <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-gradient-to-br ${getUserColor(username)} rounded-lg flex items-center justify-center shadow-md`}>
              <span className="text-white font-bold text-sm">{getInitials(username)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">{username}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-xs text-gray-400 font-medium">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Channels Section */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-3 px-2">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Hash size={14} />
            Channels
            <span className="ml-1 bg-gray-700 text-gray-300 text-xs font-bold px-1.5 py-0.5 rounded">
              {rooms.length}
            </span>
          </h3>
          <button
            onClick={() => setShowCreateRoom(true)}
            className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors"
            title="Create new room"
          >
            <Plus size={16} className="text-gray-400 hover:text-white" />
          </button>
        </div>

        {/* Room List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {rooms.map((room) => {
            const isActive = currentChat.type === "room" && currentChat.target === room.name;
            const isMember = room.members.includes(username) || room.name === "general";
            
            return (
              <div key={room.name} className="group">
                <button
                  onClick={() => handleRoomClick(room.name)}
                  className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg shadow-blue-500/30"
                      : isMember
                      ? "bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50"
                      : "bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/30 opacity-60"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    isActive ? "bg-white/20" : isMember ? "bg-gray-700/50" : "bg-gray-700/30"
                  }`}>
                    <Hash size={20} className={isActive ? "text-white" : "text-gray-400"} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className={`font-semibold text-sm truncate ${
                      isActive ? "text-white" : "text-gray-300"
                    }`}>
                      {room.name}
                    </div>
                    <div className={`text-xs font-medium truncate ${
                      isActive ? "text-blue-100" : "text-gray-500"
                    }`}>
                      {isMember ? `${room.memberCount || room.members.length} members` : "Click to join"}
                    </div>
                  </div>
                  
                  {isMember && room.name !== "general" && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      {room.createdBy === username && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRoom(room.name, room.createdBy);
                          }}
                          className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                          title="Delete room"
                        >
                          <Trash2 size={14} className="text-red-400" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLeaveRoom(room.name);
                        }}
                        className="p-1.5 hover:bg-gray-600 rounded transition-colors"
                        title="Leave room"
                      >
                        <X size={14} className="text-gray-400" />
                      </button>
                    </div>
                  )}
                  
                  {isActive && (
                    <div className="w-2 h-2 bg-blue-200 rounded-full animate-pulse"></div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Direct Messages Section */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <h3 className="text-xs font-bold mb-3 text-gray-400 uppercase tracking-wider flex items-center gap-2 px-2 sticky top-0 bg-gradient-to-b from-gray-900 to-gray-800 py-2">
          <MessageCircle size={14} />
          Direct Messages
          <span className="ml-auto bg-gray-700 text-gray-300 text-xs font-bold px-2 py-0.5 rounded-full">
            {otherUsers.length}
          </span>
        </h3>
        
        {otherUsers.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="text-gray-600" size={28} />
            </div>
            <p className="text-gray-500 text-sm font-medium">No users online</p>
            <p className="text-gray-600 text-xs mt-1">Waiting for team members...</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {otherUsers.map((user, index) => {
              const isActive = currentChat.type === "dm" && currentChat.target === user;
              return (
                <li key={index}>
                  <button
                    onClick={() => handleUserClick(user)}
                    className={`w-full p-3.5 rounded-xl transition-all duration-200 text-left flex items-center gap-3 group ${
                      isActive
                        ? "bg-gradient-to-r from-green-600 to-emerald-700 shadow-lg shadow-green-500/30"
                        : "bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50"
                    }`}
                  >
                    <div className="relative">
                      <div className={`w-9 h-9 bg-gradient-to-br ${getUserColor(user)} rounded-lg flex items-center justify-center shadow-md ${
                        isActive ? "ring-2 ring-white/30" : ""
                      }`}>
                        <span className="text-white font-bold text-xs">{getInitials(user)}</span>
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900"></div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-sm truncate ${
                        isActive ? "text-white" : "text-gray-200"
                      }`}>
                        {user}
                      </div>
                      <div className={`text-xs font-medium mt-0.5 ${
                        isActive ? "text-green-100" : "text-gray-500"
                      }`}>
                        {isActive ? "Active conversation" : "Click to message"}
                      </div>
                    </div>
                    
                    {isActive ? (
                      <MessageCircle size={16} className="text-green-200 flex-shrink-0" />
                    ) : (
                      <div className="w-2 h-2 bg-gray-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"></div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Bottom Section */}
      <div className="p-4 space-y-3 border-t border-gray-700/50">
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-gray-800/80 to-gray-800/50 border border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Lock size={18} className="text-green-400" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-400 font-medium mb-0.5">Security Status</div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-400 font-semibold">
                  End-to-End Encrypted
                </span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl p-3.5 font-semibold text-white shadow-lg hover:shadow-red-500/30 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>

      {/* Create Room Modal */}
      {showCreateRoom && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Create New Room</h3>
              <button
                onClick={() => {
                  setShowCreateRoom(false);
                  setNewRoomName("");
                  setNewRoomDesc("");
                  setSelectedMembers([]);
                }}
                className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
                disabled={loading}
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Room Name
                </label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="e.g., engineering, marketing"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  placeholder="What's this room about?"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows="3"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Add Members (Optional)
                  {selectedMembers.length > 0 && (
                    <span className="ml-2 text-blue-400">
                      {selectedMembers.length} selected
                    </span>
                  )}
                </label>
                
                {otherUsers.length === 0 ? (
                  <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                    <Users size={32} className="text-gray-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No other users online</p>
                  </div>
                ) : (
                  <div className="bg-gray-700/50 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {otherUsers.map((user) => {
                      const isSelected = selectedMembers.includes(user);
                      return (
                        <button
                          key={user}
                          type="button"
                          onClick={() => toggleMemberSelection(user)}
                          disabled={loading}
                          className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all ${
                            isSelected
                              ? "bg-blue-600 hover:bg-blue-700"
                              : "bg-gray-700 hover:bg-gray-600"
                          }`}
                        >
                          <div className={`w-8 h-8 bg-gradient-to-br ${getUserColor(user)} rounded-lg flex items-center justify-center`}>
                            <span className="text-white font-bold text-xs">
                              {getInitials(user)}
                            </span>
                          </div>
                          <div className="flex-1 text-left">
                            <div className="text-sm font-semibold text-white">
                              {user}
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected
                              ? "bg-white border-white"
                              : "border-gray-500"
                          }`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                
                {selectedMembers.length > 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    💡 Selected members will be automatically added to the room
                  </p>
                )}
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateRoom(false);
                    setNewRoomName("");
                    setNewRoomDesc("");
                    setSelectedMembers([]);
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg py-3 font-semibold transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !newRoomName.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg py-3 font-semibold transition-colors flex items-center justify-center"
                >
                                  {loading ? <LoadingSpinner /> : "Create Room"}
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }