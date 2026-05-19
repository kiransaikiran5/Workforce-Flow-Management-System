import { useState, useEffect, useRef, useCallback } from "react";
import API from "../api";
import toast from "react-hot-toast";
import { formatMessageTime } from "../utils/timeFormat";   // ✅ new

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const messagesEndRef = useRef(null);

  // New Chat modal
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [searchNew, setSearchNew] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Step 1 – fetch profile
  useEffect(() => {
    (async () => {
      try {
        const res = await API.get("/employees/me");
        setCurrentUser({
          id: res.data.user_id,
          employee_id: res.data.id,
          name: res.data.full_name,
          email: res.data.email,
        });
      } catch (err) {
        toast.error("Failed to load your profile");
      } finally {
        setLoadingUser(false);
      }
    })();
  }, []);

  // Step 2 – contacts (initial + background)
  useEffect(() => {
    if (!currentUser?.id) return;
    const fetchInitial = async () => {
      try {
        const res = await API.get("/chat/contacts");
        setContacts(res.data || []);
      } catch (err) {
        toast.error("Failed to load contacts");
      } finally {
        setLoadingContacts(false);
      }
    };
    fetchInitial();

    const interval = setInterval(async () => {
      try {
        const res = await API.get("/chat/contacts");
        setContacts(res.data || []);
      } catch (err) { /* silent */ }
    }, 30000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // Step 3 – fetch messages when a contact is selected
  const fetchMessages = useCallback(async () => {
    if (!selectedContact || !currentUser?.id) return;
    try {
      const res = await API.get(`/chat/history/${selectedContact.id}`);
      setMessages(res.data || []);
    } catch (err) {
      toast.error("Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  }, [selectedContact, currentUser]);

  useEffect(() => {
    if (!selectedContact) return;
    setLoadingMessages(true);
    fetchMessages();
  }, [selectedContact, fetchMessages]);

  // Poll for new messages every 5s (silent)
  useEffect(() => {
    if (!selectedContact) return;
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [selectedContact, fetchMessages]);

  // Auto‑scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark as read
  useEffect(() => {
    if (selectedContact) {
      API.put(`/chat/mark-read/${selectedContact.id}`).catch(() => {});
      setContacts(prev =>
        prev.map(c => (c.id === selectedContact.id ? { ...c, unread: 0 } : c))
      );
    }
  }, [selectedContact, messages]);

  // ── Open New Chat modal ──
  const openNewChat = async () => {
    setShowNewChatModal(true);
    setSearchNew("");
    if (allUsers.length === 0) {
      setLoadingUsers(true);
      try {
        const res = await API.get("/chat/users");
        setAllUsers(res.data || []);
      } catch (err) {
        toast.error("Failed to load users");
      } finally {
        setLoadingUsers(false);
      }
    }
  };

  const filteredUsers = allUsers.filter(user =>
    user.name.toLowerCase().includes(searchNew.toLowerCase())
  );

  const startNewChat = (user) => {
    if (!contacts.find(c => c.id === user.id)) {
      setContacts(prev => [...prev, { ...user, unread: 0 }]);
    }
    setSelectedContact(user);
    setShowNewChatModal(false);
  };

  // ── Send a message instantly (optimistic) ──
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact) return;

    const tempId = Date.now().toString();
    const optimisticMsg = {
      id: tempId,
      sender_id: currentUser.id,
      receiver_id: selectedContact.id,
      message: newMessage.trim(),
      read: false,
      created_at: new Date().toISOString(),     // now
    };

    // Add locally so it appears immediately
    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage("");

    try {
      const res = await API.post("/chat/send", {
        receiver_id: selectedContact.id,
        message: optimisticMsg.message,
      });
      // Replace the optimistic message with the real one from server
      setMessages(prev =>
        prev.map(m => (m.id === tempId ? { ...res.data, read: false, created_at: res.data.created_at } : m))
      );
      // Refresh contacts (unread count for other side)
      const contactsRes = await API.get("/chat/contacts");
      setContacts(contactsRes.data || []);
    } catch (err) {
      toast.error("Failed to send message");
      // Remove the optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  if (loadingUser || loadingContacts) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] max-w-6xl mx-auto p-4 gap-4">
      {/* ── Contact List ── */}
      <div className={`${selectedContact ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 lg:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden`}>
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Chat</h2>
          <button onClick={openNewChat} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">+ New Chat</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {contacts.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No conversations yet</div>
          ) : (
            contacts.map(contact => (
              <button
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-3 ${
                  selectedContact?.id === contact.id ? "bg-indigo-50 dark:bg-indigo-900/20" : ""
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300 flex items-center justify-center font-bold">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{contact.name}</p>
                  <p className="text-xs text-gray-500 truncate">{contact.role}</p>
                </div>
                {contact.unread > 0 && (
                  <span className="bg-indigo-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {contact.unread}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Chat Window ── */}
      {selectedContact ? (
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-sm border overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            <button className="md:hidden p-1" onClick={() => setSelectedContact(null)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300 flex items-center justify-center font-bold">
              {selectedContact.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium">{selectedContact.name}</p>
              <p className="text-xs text-gray-500">{selectedContact.role}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900/40">
            {loadingMessages ? (
              <div className="text-center text-gray-500 py-8">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">No messages yet. Say hello!</div>
            ) : (
              messages.map(msg => {
                const isMe = msg.sender_id === currentUser?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm shadow-sm ${
                      isMe ? "bg-indigo-600 text-white rounded-br-md" : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-md"
                    }`}>
                      <p>{msg.message}</p>
                      <p className={`text-xs mt-1 ${isMe ? "text-indigo-200" : "text-gray-400"}`}>
                        {formatMessageTime(msg.created_at)}    {/* ✅ relative time */}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t">
            <input
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 border rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
            />
            <button type="submit" disabled={!newMessage.trim()} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm">
              Send
            </button>
          </form>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-white dark:bg-gray-800 rounded-2xl shadow-sm border">
          <div className="text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-lg font-medium">Select a conversation</p>
            <p className="text-sm mt-1">Or start a new chat with someone</p>
          </div>
        </div>
      )}

      {/* ── New Chat Modal ── */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">New Chat</h2>
              <button onClick={() => setShowNewChatModal(false)} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">✕</button>
            </div>
            <input
              type="text"
              placeholder="Search users..."
              value={searchNew}
              onChange={e => setSearchNew(e.target.value)}
              className="border rounded-lg px-3 py-2 mb-4 w-full dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
            />
            <div className="flex-1 overflow-y-auto">
              {loadingUsers ? (
                <div className="text-center py-4 text-gray-500">Loading...</div>
              ) : filteredUsers.length === 0 ? (
                <p className="text-center text-gray-500">No users found</p>
              ) : (
                filteredUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => startNewChat(user)}
                    className="w-full text-left px-4 py-3 border-b hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300 flex items-center justify-center font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.role} – {user.email}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}