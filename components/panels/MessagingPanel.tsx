import React, { useState, useRef, useEffect } from 'react';

interface ChatContact {
  id: string;
  name: string;
  initials: string;
  role: string;
  online: boolean;
  avatarBg: string;
  description: string;
}

interface ChatMessage {
  id: string;
  contactId: string;
  sender: 'me' | 'system' | 'them';
  text: string;
  time: string;
}

const CONTACTS: ChatContact[] = [
  { id: 'nevik', name: 'Nevik (NVK Core)', initials: 'NK', role: 'Main OS Synthesizer', online: true, avatarBg: 'bg-indigo-900 text-indigo-300', description: 'Interactive agent. Supports chat execution like "/write file.txt content" or "/list"!' },
  { id: 'weaver', name: 'Agent Weaver', initials: 'AW', role: 'System Logic Weaver', online: true, avatarBg: 'bg-emerald-900 text-emerald-300', description: 'Handles anomalous frequency spikes and structural lattices.' },
  { id: 'scribe', name: 'Scribe of the Codex', initials: 'SC', role: 'Lore Archivist', online: true, avatarBg: 'bg-amber-955 text-amber-300 bg-amber-900', description: 'Interpreter of Discovery Axioms and historical semantic drift.' },
  { id: 'sentinel', name: 'Sentinel AI Coordinator', initials: 'AI', role: 'Autonomous Guardian', online: true, avatarBg: 'bg-fuchsia-900 text-fuchsia-300', description: 'Self-healing monitor daemon and threat level sweep coordinator.' }
];

const INITIAL_MESSAGES: ChatMessage[] = [
  { id: 'msg-1', contactId: 'nevik', sender: 'system', text: 'Secure OS communion link established.', time: '10:00 AM' },
  { id: 'msg-2', contactId: 'nevik', sender: 'them', text: 'Greetings Operator. I am the focal synthesizer of this 3D OS workspace. Type /list to see server files or chat freely.', time: '10:01 AM' },
  { id: 'msg-3', contactId: 'weaver', sender: 'system', text: 'Anomaly tracker established.', time: '10:00 AM' },
  { id: 'msg-4', contactId: 'weaver', sender: 'them', text: 'Slight frequency fluctuation registered at Giza map pyramids. Let me know if you run a diagnostic.', time: '10:01 AM' },
  { id: 'msg-5', contactId: 'scribe', sender: 'them', text: 'The Codex holds many truths forgotten in the amnesia layer. Ask me about Axiom I or the Pyramids.', time: 'Yesterday' },
  { id: 'msg-6', contactId: 'sentinel', sender: 'them', text: 'Threat index: Nominal. Direct memory leakage compaction is stable.', time: 'Yesterday' }
];

const MessagingPanel: React.FC = () => {
  const [activeContactId, setActiveContactId] = useState('nevik');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  
  // Call State Simulacrum
  const [isCalling, setIsCalling] = useState(false);
  const [callType, setCallType] = useState<'voice' | 'video'>('voice');
  const [callDuration, setCallDuration] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const saved = localStorage.getItem('nvk_comms_chats_v2');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        setMessages(INITIAL_MESSAGES);
      }
    } else {
      setMessages(INITIAL_MESSAGES);
      localStorage.setItem('nvk_comms_chats_v2', JSON.stringify(INITIAL_MESSAGES));
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeContactId]);

  // Call timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCalling) {
      interval = setInterval(() => {
        setCallDuration(d => d + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [isCalling]);

  const saveMessages = (list: ChatMessage[]) => {
    setMessages(list);
    localStorage.setItem('nvk_comms_chats_v2', JSON.stringify(list));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const queryText = input.trim();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      contactId: activeContactId,
      sender: 'me',
      text: queryText,
      time: timeStr
    };

    const nextList = [...messages, userMsg];
    saveMessages(nextList);
    setInput('');

    // Trigger customized AI replies based on recipient selection!
    setTimeout(() => {
      handleContactReply(activeContactId, queryText);
    }, 1200);
  };

  const handleContactReply = async (contactId: string, userText: string) => {
    const textLower = userText.toLowerCase().trim();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let responseText = "Understood. The signal has been logged on the primary OS bus.";

    // special interactive executions inside Chat for Nevik!
    if (contactId === 'nevik') {
      if (textLower.startsWith('/write ')) {
        // Syntax: /write filename.txt content
        const parts = userText.slice(7).split(' ');
        const filename = parts[0];
        const content = parts.slice(1).join(' ') || 'Custom write-back via communication chat channel.';
        
        if (!filename) {
          responseText = "Synthesizer error: filename specify missed. Format: /write filename.txt some_notes";
        } else {
          try {
            const res = await fetch('/api/fs/write', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filename, content })
            });
            const data = await res.json();
            if (data.success) {
              responseText = `[OS_REWRITE_SYSTEM]: Direct filesystem modification complete! Created uploads/'${filename}' on container server successfully.`;
            } else {
              responseText = `FileSystem Write Error: ${data.error || 'Write channel blocked.'}`;
            }
          } catch (err: any) {
            responseText = `FileSystem Write Error: server offline. Sandbox simulated write back folder created for ${filename}.`;
          }
        }
      } else if (textLower.startsWith('/list')) {
        try {
          const res = await fetch('/api/fs/list?path=uploads');
          const data = await res.json();
          if (data.files && data.files.length > 0) {
            const names = data.files.map((f: any) => f.name).join(', ');
            responseText = `[OS_INDEXER]: Current local variables and physical files in uploads directory: ${names}`;
          } else {
            responseText = `[OS_INDEXER]: Uploads directory is currently empty. Use the /write command to populate.`;
          }
        } catch (e) {
          responseText = `[OS_INDEXER]: Offline. Sandbox defaults mock files: system_core.bin, axiom_definitions.json, custom_nexus_template.json.`;
        }
      } else {
        // Conversational Nevik
        if (textLower.includes('pricing') || textLower.includes('tier') || textLower.includes('cost')) {
          responseText = "Operator, you are accessing the fully integrated NVK Architect platform. This localized sandbox comes equipped with extensive multi-clock, persistent calendar events, OSM geo-locating, and terminal command executors representing immense full-stack value.";
        } else if (textLower.includes('terminal') || textLower.includes('command') || textLower.includes('sh')) {
          responseText = "I monitor the local shell closely. Execute terminal queries directly from the Terminal tab in the File System explorer workspace!";
        } else if (textLower.includes('hello') || textLower.includes('hi')) {
          responseText = "Welcome back Operator. I am ready to receive core instructions. Remember we have an active geocoding cartography tab and persistent mail pipelines active.";
        } else {
          responseText = `[NEVIK OS CODES]: Query completely parsed. Standard reasoning channels are active. For direct file modifications use the command: /write filename.txt custom_note`;
        }
      }
    } 
    
    else if (contactId === 'weaver') {
      if (textLower.includes('anomaly') || textLower.includes('giza') || textLower.includes('alignment')) {
        responseText = "Indeed! Placing the correct geographic coordinates (lat 29.9792, lon 31.1342) in our Maps panel locks current pyramids alignment properly, minimizing cognitive entropy parameters.";
      } else {
        responseText = "The logic threads indicate standard alignment values. Keep monitoring the active CPU load in the System Health panel to verify logic density.";
      }
    } 
    
    else if (contactId === 'scribe') {
      if (textLower.includes('axiom') || textLower.includes('lore') || textLower.includes('rule')) {
        responseText = "Discovered Axiom IV tells us: 'Preservation is the Song of Form'. We must write persistent components and storage pipelines to secure our local structures from memory deletions!";
      } else {
        responseText = "The historical records indicate that all entities seek resonance. Browse the discoveries log or verify if your local configurations remain pristine.";
      }
    } 
    
    else if (contactId === 'sentinel') {
      if (textLower.includes('diagnostic') || textLower.includes('health') || textLower.includes('cpu')) {
        responseText = "Self-Healing diagnostic sweep is fully configured. CPU, network latency, and memory allocation bars represent true active parameters. Run the System Diagnosis Swarm for auto-compaction!";
      } else {
        responseText = "Threat sweeps complete: 0 vulnerabilities found. Sandbox encryption SSL is verified. Core operation loop is active.";
      }
    }

    const replyMsg: ChatMessage = {
      id: `msg-reply-${Date.now()}`,
      contactId,
      sender: 'them',
      text: responseText,
      time: timeStr
    };

    // Grab current messages from RAM list and append
    let currentList: ChatMessage[] = [];
    try {
      currentList = JSON.parse(localStorage.getItem('nvk_comms_chats_v2') || '[]');
    } catch (e) {
      currentList = [];
    }
    saveMessages([...currentList, replyMsg]);
  };

  const getFilteredMessages = () => {
    return messages.filter(m => m.contactId === activeContactId);
  };

  const getActiveContact = () => {
    return CONTACTS.find(c => c.id === activeContactId) || CONTACTS[0];
  };

  const launchCallSimulator = (type: 'voice' | 'video') => {
    setCallType(type);
    setIsCalling(true);
  };

  const formatCallTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleClearChatHistory = () => {
    if (confirm("Are you sure you want to wipe all Chat histories locally?")) {
      saveMessages(INITIAL_MESSAGES);
    }
  };

  return (
    <div className="w-full h-full bg-slate-950 text-slate-300 flex flex-col sm:flex-row font-sans overflow-hidden select-none relative">
      
      {/* Live Call Simulator Overlay HUD */}
      {isCalling && (
        <div className="absolute inset-0 z-[600] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="max-w-xs w-full bg-slate-900 border border-cyan-500/30 p-6 rounded-2xl flex flex-col items-center justify-center shadow-2xl relative">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 text-xl font-bold animate-pulse ${getActiveContact().avatarBg}`}>
              {getActiveContact().initials}
            </div>
            <h4 className="text-white text-base font-bold font-mono text-center">{getActiveContact().name}</h4>
            <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-mono mt-1">
              Secure Crypt-{callType.toUpperCase()} Link
            </span>

            <div className="text-lg font-mono text-slate-300 my-4 tracking-widest">
              {formatCallTime(callDuration)}
            </div>

            {/* Audio waveform mock */}
            <div className="flex gap-1 items-end h-6 mb-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-1 bg-cyan-400 rounded-full animate-bounce" style={{ height: `${Math.max(15, Math.random() * 95)}%`, animationDelay: `${i * 125}ms` }}></div>
              ))}
            </div>

            <button 
              onClick={() => setIsCalling(false)}
              className="py-2.5 px-6 bg-rose-600 hover:bg-rose-500 text-white rounded-full text-xs font-bold font-mono tracking-widest uppercase cursor-pointer transition-all"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {/* CONTACTS LIST SELECT PANEL */}
      <div className="w-full sm:w-56 bg-slate-900/60 border-r border-slate-900 flex flex-col shrink-0">
        <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
          <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase font-bold">SECURE COMMS BAY</span>
          <button 
            onClick={handleClearChatHistory}
            className="text-[9px] text-slate-600 hover:text-rose-400 font-mono transition-colors"
            title="Clean local logs"
          >
            PURGE_ALL
          </button>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar p-1.5 space-y-1">
          {CONTACTS.map((contact) => {
            const isActive = contact.id === activeContactId;
            const lastMsg = mkr => {
              const matches = messages.filter(m => m.contactId === mkr);
              return matches[matches.length - 1]?.text || "Under construction...";
            };
            
            return (
              <div 
                key={contact.id}
                onClick={() => setActiveContactId(contact.id)}
                className={`p-2.5 rounded-lg flex items-start gap-2.5 cursor-pointer border transition-all ${
                  isActive 
                    ? 'bg-slate-900 border-slate-700/60 text-white shadow' 
                    : 'bg-transparent border-transparent hover:bg-white/5'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-inner ${contact.avatarBg}`}>
                  {contact.initials}
                </div>
                <div className="truncate min-w-0 flex-grow">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11.5px] font-medium truncate">{contact.name}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                  </div>
                  <div className="text-[9.5px] text-slate-500 truncate mt-0.5">{contact.role}</div>
                  <p className="text-[9px] text-slate-600 truncate mt-1">{lastMsg(contact.id)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CHAT DISPLAY SECTION */}
      <div className="flex-grow flex flex-col min-h-0 bg-slate-950/20">
        
        {/* Chat partner header details */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3 border-b border-slate-900 bg-slate-900/40 gap-2 sm:gap-0 select-none">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold leading-none shrink-0 border border-white/5 ${getActiveContact().avatarBg}`}>
              {getActiveContact().initials}
            </div>
            <div>
              <div className="font-medium text-white text-xs sm:text-sm font-mono flex items-center gap-1.5">
                {getActiveContact().name}
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5 max-w-xs sm:max-w-md truncate">
                {getActiveContact().description}
              </div>
            </div>
          </div>

          <div className="text-slate-510 flex gap-4 justify-end items-center shrink-0">
            <button 
              onClick={() => launchCallSimulator('voice')}
              className="hover:text-cyan-400 text-slate-500 transition-colors p-1.5 hover:bg-white/5 rounded-full cursor-pointer text-sm"
              title="Establish voice pathway"
            >
              <i className="ri-phone-line"></i>
            </button>
            <button 
              onClick={() => launchCallSimulator('video')}
              className="hover:text-cyan-400 text-slate-500 transition-colors p-1.5 hover:bg-white/5 rounded-full cursor-pointer text-sm"
              title="Establish video scan feeds"
            >
              <i className="ri-video-chat-line"></i>
            </button>
          </div>
        </div>

        {/* Messaging Logs scroll map */}
        <div className="flex-grow overflow-y-auto p-4 custom-scrollbar flex flex-col gap-3 select-text bg-black/10">
          {getFilteredMessages().map(msg => (
            <div key={msg.id} className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'}`}>
              {msg.sender === 'system' ? (
                <div className="w-full text-center text-[9px] font-mono text-slate-600 my-1 truncate select-none">
                  [SYSTEM_METRIC]: {msg.text}
                </div>
              ) : (
                <div className={`max-w-[85%] sm:max-w-[70%] rounded-xl px-3.5 py-1.5 text-xs font-sans shadow-md border ${
                  msg.sender === 'me' 
                    ? 'bg-indigo-600 border-indigo-500 text-white rounded-tr-none' 
                    : 'bg-slate-900 border-slate-800 text-slate-200 rounded-tl-none leading-relaxed'
                }`}>
                  {msg.text}
                </div>
              )}
              {msg.sender !== 'system' && (
                <div className="text-[8px] font-mono text-slate-650 mt-1 select-none">{msg.time}</div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Messaging text entry box */}
        <div className="p-3 border-t border-slate-900 bg-slate-950/80">
          <form onSubmit={handleSend} className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1 bg-black/40">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={activeContactId === 'nevik' ? 'Ask Nevik, or write files e.g. /write target.txt some notes...' : 'Enter communique message...'}
              className="flex-grow bg-transparent border-none outline-none text-white placeholder-slate-600 font-sans px-1 text-xs py-1.5 focus:ring-0 min-w-0"
              autoFocus
            />
            <button 
              type="submit" 
              disabled={!input.trim()}
              className={`text-lg p-1 transition-all ${input.trim() ? 'text-cyan-400 hover:text-cyan-300 hover:scale-105 shrink-0 cursor-pointer' : 'text-slate-700'}`}
            >
              <i className="ri-send-plane-fill"></i>
            </button>
          </form>
        </div>
      </div>

      {/* OS Diagnostic sidebar info */}
      <div className="absolute bottom-1 right-2 pointer-events-none select-none text-[7.5px] text-slate-700 tracking-wider font-mono uppercase hidden sm:block">
        COM_SECURE_CHANNEL: ACTIVE_GCM_256
      </div>
    </div>
  );
};

export default MessagingPanel;
