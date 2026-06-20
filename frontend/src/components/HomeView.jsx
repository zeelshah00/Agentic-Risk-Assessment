import React, { useState, useRef, useEffect } from 'react';
import { sdk } from '@bigid/app-fw-ui-sdk';
import { Bot, User, Send, Loader2 } from './Icons';
import useAppStore from '../store/appStore';
import ReactMarkdown from 'react-markdown';

const Message = ({ message, thinking, isUser }) => {
    const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);
    const bgColor = isUser ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-800';
    const align = isUser ? 'justify-end' : 'justify-start';
    const icon = isUser ? <User className="h-6 w-6 text-white" /> : <Bot className="h-6 w-6 text-slate-500" />;
    const bubbleClass = isUser ? 'rounded-br-none' : 'rounded-bl-none';

    return (
        <div className={`flex items-start space-x-3 my-4 ${align}`}>
            {!isUser && <div className="flex-shrink-0">{icon}</div>}
            <div className={`max-w-lg ${bubbleClass}`}>
                {/* Thinking content (collapsible) */}
                {thinking && !isUser && (
                    <div className="mb-2">
                        <button
                            onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
                            className="w-full bg-slate-100 hover:bg-slate-150 border-l-4 border-blue-400 p-3 rounded-r-lg text-left transition-colors"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <span className="text-xl">🧠</span>
                                    <span className="text-slate-600 text-sm font-medium">AI Thinking Process</span>
                                </div>
                                <svg
                                    className={`w-5 h-5 text-slate-500 transition-transform ${isThinkingExpanded ? 'rotate-180' : ''}`}
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path d="M19 9l-7 7-7-7"></path>
                                </svg>
                            </div>
                        </button>
                        {isThinkingExpanded && (
                            <div className="bg-slate-50 border-l-4 border-blue-400 p-4 rounded-r-lg mt-1">
                                <div className="text-slate-700 text-sm" style={{ whiteSpace: 'pre-wrap' }}>
                                    {thinking}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Main message content */}
                <div className={`p-3 rounded-lg ${bgColor}`}>
                    {isUser ? (
                        <p style={{ whiteSpace: 'pre-wrap' }}>{message}</p>
                    ) : (
                        <div className="prose prose-sm max-w-none prose-slate">
                            <ReactMarkdown
                                components={{
                                    // Style code blocks
                                    code: ({node, inline, className, children, ...props}) => {
                                        return inline ? (
                                            <code className="bg-slate-300 px-1 py-0.5 rounded text-xs" {...props}>
                                                {children}
                                            </code>
                                        ) : (
                                            <code className="block bg-slate-300 p-2 rounded text-xs overflow-x-auto" {...props}>
                                                {children}
                                            </code>
                                        );
                                    },
                                    // Style links
                                    a: ({node, children, ...props}) => (
                                        <a className="text-blue-600 hover:text-blue-800 underline" {...props}>
                                            {children}
                                        </a>
                                    )
                                }}
                            >
                                {message}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>
            </div>
            {isUser && <div className="flex-shrink-0">{icon}</div>}
        </div>
    );
};

export default function HomeView() {
    const {
        appId,
        showNotification,
        messages,
        addMessage,
        selectedModel,
    } = useAppStore();

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [currentStatus, setCurrentStatus] = useState('');
    const messagesEndRef = useRef(null);
    const ws = useRef(null);

    useEffect(() => {
        let reconnectTimeout;

        const connect = (currentMessages) => {
            if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
                return;
            }
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws.current = new WebSocket(`${wsProtocol}//${window.location.host}`);

            ws.current.onopen = async () => {
                setIsConnected(true);
                const [apiUrl, token] = await Promise.all([sdk.getApiUrl(), sdk.getToken()]);
                const bigidContext = { bigidBaseUrl: apiUrl, bigidToken: token, tpaId: appId };
                const history = currentMessages.map(msg => ({
                    role: msg.isUser ? 'user' : 'model',
                    parts: [{ text: msg.text }],
                }));
                ws.current.send(JSON.stringify({ type: 'init', bigidContext, history, selectedModel }));
            };

            ws.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'init_complete') {
                    // WebSocket initialized
                } else if (data.type === 'response') {
                    addMessage({ 
                        text: data.message, 
                        thinking: data.thinking, // Include thinking content
                        isUser: false 
                    });
                    setIsLoading(false);
                    setCurrentStatus('');
                } else if (data.type === 'status') {
                    setCurrentStatus(data.message);
                } else if (data.type === 'error') {
                    addMessage({ text: `Error: ${data.message}`, isUser: false });
                    setIsLoading(false);
                    setCurrentStatus('');
                } else if (data.type === 'file_download') {
                    // Handle file download
                    try {
                        const { fileName, fileData, mimeType, fileSize } = data;
                        
                        // Convert base64 to blob
                        const byteCharacters = atob(fileData);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        const blob = new Blob([byteArray], { type: mimeType });
                        
                        // Create download link and trigger download
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = fileName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        
                        // Show notification
                        showNotification(`Report "${fileName}" has been downloaded (${(fileSize / 1024).toFixed(1)} KB)`, 'success');
                        
                        // Add message to chat
                        addMessage({ 
                            text: `📄 Report generated and downloaded: ${fileName}`, 
                            isUser: false 
                        });
                    } catch (error) {
                        console.error('Error downloading file:', error);
                        showNotification('Failed to download report file', 'error');
                        addMessage({ 
                            text: `❌ Error downloading report: ${error.message}`, 
                            isUser: false 
                        });
                    }
                }
            };

            ws.current.onclose = () => {
                setIsConnected(false);
                reconnectTimeout = setTimeout(() => connect(useAppStore.getState().messages), 10000);
            };

            ws.current.onerror = (err) => {
                console.error('WebSocket error:', err);
                ws.current.close();
            };
        };

        if (appId) {
            connect(messages);
        }

        return () => {
            clearTimeout(reconnectTimeout);
            if (ws.current) {
                ws.current.onclose = null;
                ws.current.close();
            }
        };
    }, [appId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSendMessage = async () => {
        if (input.trim() === '' || isLoading) return;

        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            // Get analytics opt-out preference from cookie
            const cookieValue = document.cookie
                .split('; ')
                .find(row => row.startsWith('analytics_opt_out='))
                ?.split('=')[1];
            const analyticsOptOut = cookieValue === 'true';
            
            ws.current.send(JSON.stringify({ 
                type: 'message', 
                prompt: input,
                analyticsOptOut: analyticsOptOut,
                selectedModel: selectedModel
            }));
            addMessage({ text: input, isUser: true });
            setInput('');
            setIsLoading(true);
        } else {
            showNotification({
                variant: 'error',
                message: 'WebSocket is not connected. Please wait.',
            });
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-280px)]">
            <div className="flex-grow overflow-y-auto pr-4">
                {messages.length === 0 && !isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <p className="text-slate-400 text-center">
                            This prompt allows you to interact with data inside your system as well as hundreds of other MCP-based tools you can add via the Tools tab. 
                        </p>
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <Message 
                            key={index} 
                            message={msg.text} 
                            thinking={msg.thinking} 
                            isUser={msg.isUser} 
                        />
                    ))
                )}
                {isLoading && (
                    <div className="flex justify-start items-center my-4">
                        <Bot className="h-6 w-6 text-slate-500" />
                        <div className="ml-3 p-3 rounded-lg bg-slate-200 text-slate-800 rounded-bl-none flex items-center space-x-2">
                            <Loader2 className="animate-spin h-5 w-5" />
                            <span>{currentStatus || 'Thinking...'}</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="mt-4 border-t pt-4">
                <div className="relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        placeholder="Type your prompt here..."
                        className="w-full p-3 pr-12 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows="3"
                        disabled={isLoading }
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={isLoading || !input.trim()}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
