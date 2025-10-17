import React, { useState, useRef, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

const API_BASE_URL = 'https://api.openchat.co.in';
const MODELS = [
  // { value: 'tngtech/deepseek-r1t-chimera:free', label: 'DeepSeek R1T Chimera (Free)' },
  { value: 'tngtech/deepseek-r1t2-chimera:free', label: 'DeepSeek R1T2 Chimera (Free)' },
  { value: 'openai/gpt-oss-20b:free', label: 'GPT OSS 20B (Free)' },
  { value: 'google/gemma-3-27b-it:free', label: 'Gemma 3 27B IT (Free)' },
  { value: 'qwen/qwen3-8b:free', label: 'Qwen3 Coder (Free)' },
  { value: 'qwen/qwen3-235b-a22b:free', label: 'Qwen3 235B A22B (Free)' },
  { value: 'meta-llama/llama-3.2-3b-instruct:free', label: 'Llama 3.1 8B Instruct (Free)' },
];

function formatMessage(text) {
  // Parse Markdown
  let html = marked.parse(text);
  
  // Add copy buttons to code blocks and Prism classes
  html = html.replace(/<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g, (match, attrs, code) => {
    const langMatch = attrs.match(/class="language-([^"]*)"/);
    const language = langMatch ? langMatch[1] : 'javascript';
    return `<pre class='bg-dark text-light p-2 rounded position-relative language-${language}'><code class='language-${language}'>${code.trim()}</code><button class='btn btn-sm btn-secondary copy-btn position-absolute top-0 end-0 m-2'>Copy</button></pre>`;
  });
  
  return html;
}

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    try {
      const storedMessages = JSON.parse(localStorage.getItem('chatMessages'));
      if (storedMessages) {
        setMessages(storedMessages);
      }
    } catch (error) {
      console.error('Error reading from local storage:', error);
    }
  }, []);

  const [model, setModel] = useState(MODELS[0].value);
  const [loading, setLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [multiResponses, setMultiResponses] = useState({});
  const [isMultiMode, setIsMultiMode] = useState(false);
  const chatRef = useRef(null);

  const handleNewChat = () => {
    setMessages([]);
    setMultiResponses({});
    setInput('');
    setStreamingMessage('');
    localStorage.removeItem('chatMessages');
  };

  useEffect(() => {
    if (window.Prism) {
      window.Prism.highlightAll();
    }
  }, [messages, streamingMessage]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    setMessages((prevMessages) => {
      const updatedMessages = [...prevMessages, { ...userMsg }];
      localStorage.setItem('chatMessages', JSON.stringify(updatedMessages));
      return updatedMessages;
    });
    setInput('');
    setLoading(true);
    setStreamingMessage('');

    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [...messages, userMsg].slice(-5), model, stream: true })
    });

    if (!response.ok) {
      const errorData = await response.json();
      setMessages(msgs => [...msgs, { role: 'assistant', content: `Error: ${errorData.error}` }]);
      setLoading(false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assistantMessage = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              assistantMessage += delta;
              setStreamingMessage(assistantMessage);
            }
          } catch (e) {}
        }
      }
    }

    setMessages(msgs => [...msgs, { role: 'assistant', content: assistantMessage }]);
    setStreamingMessage('');
    setLoading(false);
    setTimeout(() => {
      if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, 100);
  };

  const handleMultiSend = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    setMessages((prevMessages) => {
      const updatedMessages = [...prevMessages, { ...userMsg }];
      localStorage.setItem('chatMessages', JSON.stringify(updatedMessages));
      return updatedMessages;
    });
    setInput('');
    setLoading(true);
    setMultiResponses({});

    MODELS.forEach(async (modelObj) => {
      try {
        const response = await fetch(`${API_BASE_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [...messages, userMsg].slice(-5), model: modelObj.value, stream: false })
        });
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || `Error: ${data.error}`;
        setMultiResponses(prev => ({ ...prev, [modelObj.label]: content }));
      } catch (error) {
        setMultiResponses(prev => ({ ...prev, [modelObj.label]: `Error: ${error.message}` }));
      }
    });

    // Set loading to false after a short delay to allow updates
    setTimeout(() => setLoading(false), 1000);
  };

  // Copy code block handler
  const handleCopy = (e) => {
    if (e.target.classList.contains('copy-btn')) {
      const code = e.target.previousSibling.textContent;
      navigator.clipboard.writeText(code);
      e.target.textContent = 'Copied!';
      setTimeout(() => { e.target.textContent = 'Copy'; }, 1500);
    }
  };

  return (
    <div className="container-fluid vh-100 d-flex flex-column bg-light">
      <div className="row flex-grow-1">
        <div className="col-12 d-flex flex-column">
          {/* Header */}
          <div className="bg-primary text-white p-3 d-flex justify-content-between align-items-center">
            <div>
              <h4 className="mb-0">OpenRouter Chat</h4>
              <small>Powered by AI Models</small>
            </div>
            <div className="d-flex align-items-center gap-3">
              <button className="btn btn-outline-light btn-sm" onClick={handleNewChat}>New Chat</button>
              <div className="form-check form-switch">
                <input className="form-check-input" type="checkbox" id="multiMode" checked={isMultiMode} onChange={e => setIsMultiMode(e.target.checked)} />
                <label className="form-check-label text-white" htmlFor="multiMode">Six Perspectives Mode</label>
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-grow-1 overflow-auto p-3" ref={chatRef} onClick={handleCopy} style={{ maxHeight: 'calc(100vh - 200px)' }}>
            {messages.map((msg, idx) => (
              <div key={idx} className={`d-flex mb-3 ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                <div className={`p-3 rounded-3 shadow-sm ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-white border'}`} style={{ maxWidth: '70%' }}>
                  <div dangerouslySetInnerHTML={{ __html: msg.role === 'assistant' ? formatMessage(msg.content) : msg.content }} />
                </div>
              </div>
            ))}
            {streamingMessage && (
              <div className="d-flex mb-3 justify-content-start">
                <div className="p-3 rounded-3 shadow-sm bg-white border" style={{ maxWidth: '70%' }}>
                  <div dangerouslySetInnerHTML={{ __html: formatMessage(streamingMessage) }} />
                  <small className="text-muted">Typing...</small>
                </div>
              </div>
            )}
            {loading && !streamingMessage && (
              <div className="d-flex mb-3 justify-content-start">
                <div className="p-3 rounded-3 shadow-sm bg-white border">
                  <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                  <span className="ms-2 text-muted">Assistant is thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Multi Responses */}
          {Object.keys(multiResponses).length > 0 && (
            <div className="p-3 bg-light border-top">
              <h5>Six Perspectives</h5>
              <div className="d-flex overflow-auto" style={{ maxHeight: '400px' }}>
                {Object.entries(multiResponses).map(([modelName, content]) => (
                  <div key={modelName} className="card me-3" style={{ minWidth: '300px', maxWidth: '300px' }}>
                    <div className="card-header bg-secondary text-white">
                      <strong>{modelName}</strong>
                    </div>
                    <div className="card-body overflow-auto" onClick={handleCopy} style={{ maxHeight: '300px' }}>
                      <div dangerouslySetInnerHTML={{ __html: formatMessage(content) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="bg-white border-top p-3">
            <div className="d-flex gap-2 align-items-end">
              <div className="flex-grow-1">
                <textarea
                  className="form-control"
                  rows="2"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Type your message..."
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), isMultiMode ? handleMultiSend() : handleSend())}
                  disabled={loading}
                  style={{ resize: 'none' }}
                />
              </div>
              {!isMultiMode && (
                <select className="form-select" value={model} onChange={e => setModel(e.target.value)} disabled={loading} style={{ width: '200px' }}>
                  {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              )}
              <button className="btn btn-primary" onClick={isMultiMode ? handleMultiSend : handleSend} disabled={loading || !input.trim()}>
                {loading ? <span className="spinner-border spinner-border-sm" role="status"></span> : isMultiMode ? 'Ask All Models' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
