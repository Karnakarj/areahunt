import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Coordinate } from '../types.ts';
import { askGeminiAboutArea } from '../services/geminiService.ts';

interface AIAssistantProps {
  currentLocation: Coordinate | null;
  isOpen: boolean;
  onClose: () => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ currentLocation, isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Hi! I'm AreaHunt AI. I can help you explore. Try asking 'What is this building?' or 'Are there shops nearby?'" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const response = await askGeminiAboutArea(userMsg.text, currentLocation);
    
    setMessages(prev => [...prev, response]);
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 pointer-events-auto" onClick={onClose}></div>

      {/* Chat Window */}
      <div className="bg-gray-900 w-full sm:w-[400px] h-[80dvh] sm:h-[600px] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden pointer-events-auto relative shadow-2xl transform transition-transform duration-300">
        
        {/* Header */}
        <div className="bg-gray-800 p-4 flex justify-between items-center border-b border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✨</span>
            <h3 className="font-bold text-white">Area Assistant</h3>
          </div>
          <button onClick={onClose} className="bg-gray-700 p-2 rounded-full text-gray-300 hover:text-white">✕</button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-gray-900" ref={scrollRef}>
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-gray-800 text-gray-200 rounded-bl-none border border-gray-700'
              }`}>
                <p>{msg.text}</p>
                {/* Links/Grounding */}
                {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-600 flex flex-col gap-1">
                        {msg.groundingUrls.map((url, i) => (
                            <a key={i} href={url.uri} target="_blank" rel="noreferrer" className="text-xs text-blue-400 truncate block hover:underline">
                                🔗 {url.title || 'Map Link'}
                            </a>
                        ))}
                    </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
             <div className="flex justify-start animate-pulse">
                <div className="bg-gray-800 px-4 py-2 rounded-2xl rounded-bl-none text-gray-400 text-xs">Thinking...</div>
             </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 bg-gray-800 border-t border-gray-700 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about this area..."
            className="flex-1 bg-gray-900 text-white rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            onClick={handleSend}
            className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-500 disabled:opacity-50"
            disabled={isLoading}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
