import { useState, useEffect, useRef } from "react";
import { Send, User, Bot } from "lucide-react";
import api from "../../services/api";

// Chat Tab Component
export default function ChatTab() {
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hello! Ask me anything about the materials in your joined classes.' }
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputQuery.trim() || isTyping) return;
    const userMessage = { sender: 'user', text: inputQuery };
    setMessages(prev => [...prev, userMessage]);
    setInputQuery("");
    setIsTyping(true);
    try {
      const response = await api.post("/ai/chat", { query: inputQuery });
      const aiMessage = { sender: 'ai', text: response.data.answer };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      const errorMessage = { sender: 'ai', text: 'Sorry, an error occurred. Please try again later.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 flex flex-col h-[70vh]">
      <div className="p-4 border-b border-gray-200"><h2 className="text-xl font-semibold text-gray-800">AI Learning Assistant</h2></div>
      <div className="p-6 flex-1 overflow-y-auto bg-gray-50">
        <div className="space-y-6">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'ai' && <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white flex-shrink-0"><Bot size={22}/></div>}
              <div className={`px-4 py-3 rounded-2xl max-w-2xl shadow-sm ${msg.sender === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-white text-gray-700 rounded-bl-none'}`}><p className="text-sm" style={{whiteSpace: "pre-wrap"}}>{msg.text}</p></div>
              {msg.sender === 'user' && <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 flex-shrink-0"><User size={22}/></div>}
            </div>
          ))}
          {isTyping && <div className="flex items-start gap-3"><div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white flex-shrink-0"><Bot size={22}/></div><div className="px-4 py-3 rounded-2xl bg-white shadow-sm"><div className="flex items-center justify-center gap-1.5"><span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span><span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span><span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce"></span></div></div></div>}
          <div ref={chatEndRef} />
        </div>
      </div>
      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <input type="text" value={inputQuery} onChange={(e) => setInputQuery(e.target.value)} placeholder="Ask about materials..." className="flex-1 px-4 py-2 bg-gray-100 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isTyping} />
          <button type="submit" className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 disabled:bg-blue-400 transition-colors" disabled={isTyping || !inputQuery.trim()}><Send size={20} /></button>
        </form>
      </div>
    </div>
  );
}
