import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, User, X, Minimize2, Maximize2, Camera } from 'lucide-react';
import { captureScreen } from './utils/screenshot';
import { monitorDOM } from './utils/domMonitor';

interface Message {
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Check if we're running in a Chrome extension context
const isChromeExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

function App() {

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [currentDomain, setCurrentDomain] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (isChromeExtension) {
      // Get current domain
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.url) {
          const url = new URL(tabs[0].url);
          setCurrentDomain(url.hostname);
        }
      });

      // Start DOM monitoring
      monitorDOM((changes) => {
        sendToN8N({
          type: 'dom_change',
          changes,
          url: window.location.href
        });
      });
    } else {
      // Development fallback
      setCurrentDomain(window.location.hostname);
    }
  }, []);
  
  const sendToN8N = async (data: any) => {
    try {
      const response = await fetch(import.meta.env.VITE_N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      return await response.json();
    } catch (error) {
      console.error('Error sending data to n8n:', error);
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
  
    const userMessage: Message = {
      type: 'user',
      content: input,
      timestamp: new Date()
    };
  
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
  
    try {
      // Take screenshot
      const screenshot = await captureScreen();
      
      // Send to n8n with the compressed screenshot
      const response = await sendToN8N({
        message: input,
        screenshot,
      });
  
      if (response) {
        const assistantMessage: Message = {
          type: 'assistant',
          content: response.reply,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while sending the message');
      
      // Add error message to chat
      const errorMessage: Message = {
        type: 'assistant',
        content: 'Sorry, there was an error sending your message. Please try again with a smaller screenshot or without a screenshot.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`fixed right-0 top-0 h-screen ${isMinimized ? 'w-16' : 'w-96'} 
                    bg-gradient-to-b from-gray-900 to-black text-white shadow-xl 
                    transition-all duration-300 ease-in-out`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center space-x-2">
          {!isMinimized && <h1 className="text-xl font-bold">N8N Copilot</h1>}
        </div>
        <div className="flex items-center space-x-2">
          {isMinimized ? (
            <Maximize2 className="cursor-pointer" onClick={() => setIsMinimized(false)} />
          ) : (
            <Minimize2 className="cursor-pointer" onClick={() => setIsMinimized(true)} />
          )}
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Chat Area */}
          <div className="h-[calc(100vh-8rem)] overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                <div className={`max-w-[80%] ${message.type === 'user' ? 'bg-blue-600' : 'bg-gray-800'} 
                                rounded-lg p-3`}>
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="absolute bottom-0 w-full p-4 bg-gray-900">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Type your message..."
              />
              <button
                onClick={handleSendMessage}
                className="bg-blue-600 hover:bg-blue-700 rounded-lg p-2"
              >
                <MessageSquare size={20} />
              </button>
              <button
                onClick={captureScreen}
                className="bg-gray-800 hover:bg-gray-700 rounded-lg p-2"
              >
                <Camera size={20} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;