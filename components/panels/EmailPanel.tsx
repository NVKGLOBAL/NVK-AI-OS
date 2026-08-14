import React, { useState, useEffect } from 'react';

interface Email {
  id: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  time: string;
  unread: boolean;
  starred: boolean;
  folder: 'inbox' | 'sent' | 'drafts' | 'trash';
}

const INITIAL_EMAILS: Email[] = [
  { id: 'mail-1', sender: 'system@nexus.os', recipient: 'nevik@lattice.os', subject: 'System Core Update 1.12.8 Applied', body: 'The latest core update has been applied successfully to the spatial virtual engine. All local ports, nodes, and WebGPU accelerators are stable. Standard self-healing routines remain fully active.', time: '10:42 AM', unread: true, starred: true, folder: 'inbox' },
  { id: 'mail-2', sender: 'agent.weaver@nexus.os', recipient: 'nevik@lattice.os', subject: 'Anomaly Resonance Waveform Detected', body: 'We have detected a slight anomalous resonance frequency spike in sector 7G. Recommended response: check the Maps Panel Pyramids Coordinate, stabilize the lattice, and verify overall cluster status.', time: 'Yesterday', unread: false, starred: false, folder: 'inbox' },
  { id: 'mail-3', sender: 'admin@nexus.os', recipient: 'nevik@lattice.os', subject: 'Welcome to NVK OS Workspace', body: 'Your new sandboxed environment is completely finalized. You have thousands of dollars worth of operational utilities ready to go, including active file writing channels, direct geocoding map overlays, and secure local messaging pipelines. Explore the Codex and begin your work.', time: 'Jun 05', unread: false, starred: true, folder: 'inbox' }
];

const EmailPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'drafts' | 'trash' | 'starred'>('inbox');
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'compose'>('list');
  
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Compose variables
  const [toInput, setToInput] = useState('');
  const [subjectInput, setSubjectInput] = useState('');
  const [bodyInput, setBodyInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{text: string, type: 'success' | 'info'} | null>(null);

  // Load emails
  useEffect(() => {
    const saved = localStorage.getItem('nvk_mail_db');
    if (saved) {
      try {
        setEmails(JSON.parse(saved));
      } catch (e) {
        setEmails(INITIAL_EMAILS);
      }
    } else {
      setEmails(INITIAL_EMAILS);
      localStorage.setItem('nvk_mail_db', JSON.stringify(INITIAL_EMAILS));
    }
  }, []);

  const saveEmails = (list: Email[]) => {
    setEmails(list);
    localStorage.setItem('nvk_mail_db', JSON.stringify(list));
  };

  const showAlert = (text: string, type: 'success' | 'info' = 'success') => {
    setAlertMsg({ text, type });
    setTimeout(() => setAlertMsg(null), 3500);
  };

  const handleComposeSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toInput.trim() || !subjectInput.trim()) {
      alert("Please supply recipient address and subject header.");
      return;
    }

    setIsSending(true);

    const newEmail: Email = {
      id: `mail-${Date.now()}`,
      sender: 'my_profile@nexus.os',
      recipient: toInput.trim().toLowerCase(),
      subject: subjectInput.trim(),
      body: bodyInput.trim() || '[Empty Message Body]',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      unread: false,
      starred: false,
      folder: 'sent'
    };

    const nextEmails = [...emails, newEmail];
    saveEmails(nextEmails);
    
    const sentAddress = toInput.trim().toLowerCase();
    const messageText = bodyInput.toLowerCase();

    // Reset Compose
    setToInput('');
    setSubjectInput('');
    setBodyInput('');
    setIsSending(false);
    setActiveSubTab('list');
    setActiveTab('sent');
    setSelectedEmailId(null);
    showAlert("Secure email routed successfully!");

    // Autonomous intelligence reply trigger!
    if (sentAddress.includes('nevik') || sentAddress.includes('system') || sentAddress.includes('agent')) {
      const userSubject = newEmail.subject;
      const userBody = newEmail.body;
      
      const triggerReply = async () => {
        try {
          const sysInstruction = `You are a secure, automated system responder for the NVK OS Space Kernel virtual network.
Your persona is an automated cybernetic operator sentinel ("Sentinel Core v1.1" or "System Coordinator" or "Accounts Sentinel Node").
You have received a secure email communique from the system administrator operator ('my_profile@nexus.os').
Draft an appropriate, high-tech, responsive reply. Keep it context-sensitive to what the operator asked in their message body.
If they ask about subscription, costs, or licenses, act as administrative portal accounts Sentinel. Explain that NVK OS includes all spatial modules and local OSM mapping, with zero hidden costs.
If they ask about anomalies, bugs, or diagnostics, report active self-healing loops and green-light telemetry metrics.
Ensure your response body is concise, professional, cybernetic, and helpful (max 150 words).
Do NOT write To/From headers or Subject lines in your output block—start directly with a professional cybernetic greeting like "Greetings Operator," or "Secure Link Established," and sign off clearly as a Sentinel node.`;

          const res = await fetch('/api/gemini/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: `Subject: ${userSubject}\n\nBody:\n${userBody}\n\nRecipient Core Vector: ${sentAddress}`,
              systemInstruction: sysInstruction
            })
          });

          const data = await res.json();
          let replyBody = '';
          if (data && data.text) {
            replyBody = data.text.trim();
          } else {
            throw new Error("Empty representation");
          }

          const replyMail: Email = {
            id: `mail-reply-${Date.now()}`,
            sender: sentAddress || 'coordinator.sentinel@nexus.os',
            recipient: 'my_profile@nexus.os',
            subject: `RE: ${userSubject}`,
            body: replyBody,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unread: true,
            starred: true,
            folder: 'inbox'
          };

          // Save and alert
          const currentMails = JSON.parse(localStorage.getItem('nvk_mail_db') || '[]');
          const updatedMails = [...currentMails, replyMail];
          saveEmails(updatedMails);
          showAlert("Incoming secure communique arrived! Check Inbox.", 'info');
        } catch (err) {
          // Fallback if API keys are not present or fetch fails
          let fallbackBody = `Hello Operator,\n\nI have received your query regarding: "${userSubject}".\n\nI am currently analyzing your local metrics. The NVK Operating Lattice is fully configured and optimized. If you require further customization, please use the Terminal module or update the Cluster node configurations.\n\nBest Regards,\nCoordinator Sentinel v1.1`;
          
          if (userBody.toLowerCase().includes('pricing') || userBody.toLowerCase().includes('tier') || userBody.toLowerCase().includes('cost')) {
            fallbackBody = `Greetings Operator,\n\nRegarding subscription or pricing: NVK OS Architect includes thousands of dollars worth of features right out of the box in this tier, without hidden API cost factors. Enjoy complete file execution channels and Nominatim mapping.\n\nCordially,\nAccounts Sentinel Core`;
          } else if (userBody.toLowerCase().includes('anomaly') || userBody.toLowerCase().includes('error') || userBody.toLowerCase().includes('leak')) {
            fallbackBody = `SHIELD ACTIVE WARNING ⚠️\n\nAn anomalous core pattern matched. Executing automated self-healing sweep of local memory arrays. Your health metrics remain stabilized at 100%. No further human intervention required.\n\nLog reference: #${Math.floor(Math.random() * 100000)}`;
          }

          const replyMail: Email = {
            id: `mail-reply-${Date.now()}`,
            sender: sentAddress || 'coordinator.sentinel@nexus.os',
            recipient: 'my_profile@nexus.os',
            subject: `RE: ${userSubject}`,
            body: fallbackBody,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unread: true,
            starred: true,
            folder: 'inbox'
          };

          const currentMails = JSON.parse(localStorage.getItem('nvk_mail_db') || '[]');
          const updatedMails = [...currentMails, replyMail];
          saveEmails(updatedMails);
          showAlert("Incoming secure communique arrived! Check Inbox.", 'info');
        }
      };

      setTimeout(triggerReply, 3000);
    }
  };

  const handleDeleteMail = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const list = emails.map(m => {
      if (m.id === id) {
        if (m.folder === 'trash') {
          // Permanently purge
          return null;
        } else {
          // Send to trash folder
          return { ...m, folder: 'trash' } as Email;
        }
      }
      return m;
    }).filter(Boolean) as Email[];

    saveEmails(list);
    if (selectedEmailId === id) setSelectedEmailId(null);
    showAlert("Message pruned");
  };

  const handleToggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const list = emails.map(m => m.id === id ? { ...m, starred: !m.starred } : m);
    saveEmails(list);
  };

  const handleSelectMail = (id: string) => {
    setSelectedEmailId(id);
    const list = emails.map(m => m.id === id ? { ...m, unread: false } : m);
    saveEmails(list);
  };

  // Filter computation
  const getFilteredEmails = () => {
    return emails.filter(m => {
      // folder filter
      if (activeTab === 'starred') {
        if (!m.starred) return false;
      } else {
        if (m.folder !== activeTab) return false;
      }

      // Search match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          m.subject.toLowerCase().includes(query) ||
          m.sender.toLowerCase().includes(query) ||
          m.body.toLowerCase().includes(query)
        );
      }
      return true;
    }).sort((a,b) => b.id.localeCompare(a.id));
  };

  const getUnreadCount = (folderName: 'inbox' | 'sent' | 'drafts' | 'trash') => {
    return emails.filter(m => m.folder === folderName && m.unread).length;
  };

  const getStarredCount = () => {
    return emails.filter(m => m.starred).length;
  };

  return (
    <div className="w-full h-full bg-slate-950 text-slate-300 flex flex-col font-sans select-none relative overflow-hidden">
      
      {/* Upper Alerts Banner HUD */}
      {alertMsg && (
        <div className={`absolute top-12 right-4 z-[9999] px-4 py-2 border text-xs font-mono rounded-lg shadow-2xl flex items-center gap-1.5 animate-bounce ${
          alertMsg.type === 'success' 
            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/20' 
            : 'bg-cyan-950/95 text-cyan-300 border-cyan-500/35'
        }`}>
          <i className="ri-notification-3-line text-lg animate-pulse"></i>
          {alertMsg.text}
        </div>
      )}

      {/* Control Top Action Header */}
      <div className="flex bg-slate-900 border-b border-slate-800">
        <button 
          onClick={() => { setActiveSubTab('list'); setSelectedEmailId(null); }}
          className={`px-4 py-3 text-[10px] uppercase tracking-widest font-mono border-b-2 transition-all flex items-center gap-1.5 ${activeSubTab === 'list' ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          <i className="ri-inbox-archive-line"></i> Mailbox ({emails.length})
        </button>
        <button 
          onClick={() => setActiveSubTab('compose')}
          className={`px-4 py-3 text-[10px] uppercase tracking-widest font-mono border-b-2 transition-all flex items-center gap-1.5 ${activeSubTab === 'compose' ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          <i className="ri-edit-box-line"></i> Compose communiQue
        </button>
      </div>

      <div className="flex-grow flex min-h-0 divide-x divide-slate-900 overflow-hidden">
        
        {/* SIDE BAR NAVIGATION PATHWAY */}
        <div className="w-20 sm:w-44 bg-slate-950 flex flex-col pt-3 py-2 shrink-0 select-none">
          <div className="space-y-1 px-1 sm:px-2.5">
            {[
              { id: 'inbox', label: 'Inbox', icon: 'ri-mail-unread-line', count: getUnreadCount('inbox') },
              { id: 'sent', label: 'Sent', icon: 'ri-send-plane-line', count: 0 },
              { id: 'drafts', label: 'Drafts', icon: 'ri-draft-line', count: getUnreadCount('drafts') },
              { id: 'starred', label: 'Starred', icon: 'ri-star-line', count: getStarredCount() },
              { id: 'trash', label: 'Trash', icon: 'ri-delete-bin-line', count: 0 }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setActiveSubTab('list');
                  setSelectedEmailId(null);
                }}
                className={`w-full text-left py-1.5 px-2.5 rounded-lg flex items-center justify-between text-xs font-medium transition-all cursor-pointer ${
                  activeTab === tab.id 
                    ? 'bg-slate-900 text-cyan-400 font-semibold' 
                    : 'text-slate-500 hover:text-slate-350 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <i className={`${tab.icon} text-sm sm:text-base`}></i>
                  <span className="hidden sm:inline truncate">{tab.label}</span>
                </div>
                {tab.count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[8px] font-mono font-bold leading-none">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* DETAILS SECTION FIELD */}
        <div className="flex-grow flex flex-col min-h-0 bg-slate-900/10 overflow-hidden">
          
          {activeSubTab === 'list' ? (
            <div className="flex-grow flex flex-col overflow-hidden h-full">
              
              {/* Search Header for list tab */}
              {!selectedEmailId && (
                <div className="p-2 sm:p-3 border-b border-slate-905 bg-slate-950 flex gap-2">
                  <div className="flex-grow flex bg-slate-900/70 border border-slate-800 rounded-lg px-2.5 items-center">
                    <i className="ri-search-line text-slate-500 text-xs mr-2"></i>
                    <input 
                      type="text" 
                      placeholder="Search messages by sender or subject..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent border-none outline-none text-white text-xs py-1.5 w-full focus:ring-0"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="text-slate-550 hover:text-slate-350">
                        <i className="ri-close-fill text-xs"></i>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* LIST CORE CODES */}
              {!selectedEmailId ? (
                <div className="flex-grow overflow-y-auto custom-scrollbar divide-y divide-slate-900/65">
                  {getFilteredEmails().length === 0 ? (
                    <div className="text-center py-12 text-slate-550 flex flex-col items-center gap-2">
                      <i className="ri-mail-open-line text-4xl opacity-30"></i>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Folder is empty</span>
                    </div>
                  ) : (
                    getFilteredEmails().map(email => (
                      <div 
                        key={email.id} 
                        onClick={() => handleSelectMail(email.id)}
                        className={`p-3.5 flex items-start gap-3 cursor-pointer hover:bg-slate-900/75 transition-all ${email.unread ? 'bg-slate-900/20' : ''}`}
                      >
                        {/* Star symbol click */}
                        <button 
                          onClick={(e) => handleToggleStar(email.id, e)}
                          className={`mt-0.5 text-sm cursor-pointer hover:scale-115 transition-all ${email.starred ? 'text-amber-400' : 'text-slate-650 hover:text-slate-500'}`}
                        >
                          <i className={email.starred ? "ri-star-fill" : "ri-star-line"}></i>
                        </button>

                        <div className="flex-grow min-w-0">
                          <div className="flex justify-between items-baseline mb-1">
                            <span className={`text-[11.5px] truncate font-medium pr-2 ${email.unread ? 'text-white font-bold' : 'text-slate-400'}`}>
                              {email.sender}
                            </span>
                            <span className="text-[9px] font-mono text-slate-550 shrink-0">{email.time}</span>
                          </div>
                          
                          <div className={`text-xs truncate mb-1 pr-6 ${email.unread ? 'text-cyan-400 font-semibold' : 'text-slate-300'}`}>
                            {email.subject}
                          </div>
                          <p className="text-[10.5px] text-slate-500 truncate">{email.body}</p>
                        </div>

                        {/* Quick Trash actions */}
                        <button 
                          onClick={(e) => handleDeleteMail(email.id, e)}
                          className="text-slate-700 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 sm:opacity-100 cursor-pointer self-center"
                          title="Prune / Delete"
                        >
                          <i className="ri-delete-bin-2-line"></i>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                /* DETAILED EXPLICIT EMAIL READING */
                <div className="flex-grow flex flex-col h-full bg-slate-950/40 select-text">
                  {(() => {
                    const mailObj = emails.find(e => e.id === selectedEmailId);
                    if (!mailObj) return <div className="text-center py-6"> Communique has been cleared. </div>;
                    return (
                      <>
                        <div className="p-3 sm:p-4 border-b border-slate-900 bg-slate-900/35 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <button 
                              onClick={() => setSelectedEmailId(null)} 
                              className="text-slate-455 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-full"
                            >
                              <i className="ri-arrow-left-line text-lg"></i>
                            </button>
                            <div className="truncate">
                              <h3 className="text-white text-xs sm:text-sm font-semibold truncate font-mono leading-snug">{mailObj.subject}</h3>
                              <div className="text-[9.5px] text-slate-500 truncate font-mono mt-0.5">
                                From: <span className="text-slate-300">{mailObj.sender}</span> ➔ To: <span className="text-slate-400">{mailObj.recipient}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-1.5 shrink-0 select-none">
                            <button 
                              onClick={(e) => handleToggleStar(mailObj.id, e)}
                              className={`p-1.5 hover:bg-white/5 rounded text-xs leading-none ${mailObj.starred ? 'text-amber-400' : 'text-slate-500'}`}
                              title={mailObj.starred ? "Unstar" : "Star"}
                            >
                              <i className={mailObj.starred ? "ri-star-fill text-sm" : "ri-star-line text-sm"}></i>
                            </button>
                            <button 
                              onClick={() => handleDeleteMail(mailObj.id)}
                              className="p-1.5 bg-slate-800/20 hover:bg-rose-950/50 rounded text-slate-500 hover:text-rose-400 text-xs shrink-0"
                              title="TrashCommunique"
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          </div>
                        </div>

                        <div className="p-5 flex-grow overflow-y-auto custom-scrollbar text-xs sm:text-[13px] leading-relaxed text-slate-300 font-sans whitespace-pre-wrap">
                          {mailObj.body}
                          <div className="border-t border-white/5 mt-8 pt-4 text-[9px] font-mono text-slate-600 block uppercase select-none">
                            LATTICE_SSL_HANDSHAKE: ENCRYPTED_STREAM_SECURE
                            <br/>
                            Transmitted via secure Nexus OS relay portal.
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : (
            /* COMPOSE MESSAGE COMPONENT */
            <form onSubmit={handleComposeSend} className="w-full flex flex-col h-full p-4 bg-slate-950/60 font-mono text-xs gap-3">
              <div className="flex bg-slate-950 border border-slate-900 rounded-lg p-2.5 items-center">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold w-12 shrink-0">TO:</span>
                <input 
                  type="email" 
                  placeholder="e.g. nevik@lattice.os, system@nexus.os, or client address..." 
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  required
                  className="bg-transparent border-none outline-none text-white text-xs w-full focus:ring-0"
                />
              </div>

              <div className="flex bg-slate-950 border border-slate-900 rounded-lg p-2.5 items-center">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold w-12 shrink-0">TOPIC:</span>
                <input 
                  type="text" 
                  placeholder="Subject of custom secure route..." 
                  value={subjectInput}
                  onChange={(e) => setSubjectInput(e.target.value)}
                  required
                  className="bg-transparent border-none outline-none text-white text-xs w-full focus:ring-0"
                />
              </div>

              <div className="flex-grow flex bg-slate-950 border border-slate-900 rounded-xl p-3 flex-col min-h-36">
                <span className="text-[7.5px] text-slate-600 uppercase font-bold mb-1 select-none">COMMUNIQUE_BODY_STREAM:</span>
                <textarea 
                  placeholder="Write your encrypted message packet securely here..." 
                  value={bodyInput}
                  onChange={(e) => setBodyInput(e.target.value)}
                  className="flex-grow bg-transparent border-none outline-none text-slate-300 resize-none custom-scrollbar leading-relaxed text-xs focus:ring-0"
                />
              </div>

              <div className="flex justify-between items-center bg-slate-950/20 p-1.5 border border-white/5 rounded-lg select-none">
                <span className="text-[8.5px] text-slate-600 font-mono">ENCRYPT_MODE: GCM_256B</span>
                <button 
                  type="submit" 
                  disabled={isSending}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2 rounded-lg font-bold tracking-widest transition-all gap-1.5 flex items-center text-[10px] uppercase cursor-pointer shadow-lg hover:shadow-cyan-500/10"
                >
                  {isSending ? (
                    <>
                      <i className="ri-loader-3-line animate-spin text-sm"></i> Routing...
                    </>
                  ) : (
                    <>
                      <i className="ri-send-plane-fill text-xs"></i> SEND PACKET
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>

      </div>

      {/* Diagnostics footer code */}
      <div className="p-1 px-2 border-t border-slate-900 bg-slate-950 text-[8.5px] font-mono text-slate-600 flex justify-between uppercase mt-auto select-none shrink-0">
        <span>MAIL_GATEWAY: ONLINE_PORT_3000</span>
        <span>STATUS_SUCCESS</span>
      </div>
    </div>
  );
};

export default EmailPanel;
