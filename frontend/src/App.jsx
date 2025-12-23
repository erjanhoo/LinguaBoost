import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Login from "./components/Login";
import Signup from "./components/Signup";
import VerifyCode from "./components/VerifyCode";

const api = axios.create({ baseURL: "/api" });
const levelOptions = ["A1", "A2", "B1", "B2"];
const lengthOptions = [
  { value: "короткая", label: "Short" },
  { value: "средняя", label: "Medium" },
  { value: "длинная", label: "Long" },
];
const topicOptions = [
  { value: "any", label: "Any Topic" },
  { value: "sports", label: "Sports" },
  { value: "school", label: "School" },
  { value: "travel", label: "Travel" },
  { value: "food", label: "Food" },
  { value: "work", label: "Work" },
  { value: "family", label: "Family" },
  { value: "city", label: "City" },
  { value: "hobbies", label: "Hobbies" },
  { value: "health", label: "Health" },
  { value: "technology", label: "Technology" },
];
const sentenceTypeOptions = [
  { value: "mixed", label: "Mixed" },
  { value: "affirmative", label: "Affirmative" },
  { value: "interrogative", label: "Questions" },
  { value: "negative", label: "Negative" },
];

const tenseOptions = [
  { value: "mixed", label: "Mixed" },
  { value: "present", label: "Present" },
  { value: "past", label: "Past" },
  { value: "future", label: "Future" },
];

const setAuthHeader = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Token ${token}`;
    localStorage.setItem("token", token);
  } else {
    delete api.defaults.headers.common.Authorization;
    localStorage.removeItem("token");
  }
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState("");
  const [info, setInfo] = useState("");

  const [progress, setProgress] = useState(null);

  // Auto-hide notifications
  useEffect(() => {
    if (authError || info) {
      const timer = setTimeout(() => {
        setAuthError("");
        setInfo("");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [authError, info]);

  // Auth page state
  const [authPage, setAuthPage] = useState(null); // null | "login" | "signup"

  // Custom dropdown state
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);
  const [showLengthDropdown, setShowLengthDropdown] = useState(false);
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);
  const [showSentenceTypeDropdown, setShowSentenceTypeDropdown] = useState(false);
  const [showTenseDropdown, setShowTenseDropdown] = useState(false);
  const [showWordsCountDropdown, setShowWordsCountDropdown] = useState(false);
  const [wordsCountInput, setWordsCountInput] = useState('');

  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerCode, setRegisterCode] = useState("");
  const [needsRegCode, setNeedsRegCode] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [needs2FA, setNeeds2FA] = useState(false);

  const [words, setWords] = useState([]);
  const [selectedWords, setSelectedWords] = useState([]);
  const [newWord, setNewWord] = useState("");
  const [wordSearch, setWordSearch] = useState("");
  const [loadingWords, setLoadingWords] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [level, setLevel] = useState("A1");
  const [length, setLength] = useState("короткая");
  const [topic, setTopic] = useState("any");
  const [sentenceType, setSentenceType] = useState("mixed");
  const [tense, setTense] = useState("mixed");
  const [grammarFocusEnabled, setGrammarFocusEnabled] = useState(false);
  const [grammarFocus, setGrammarFocus] = useState("");
  const [languageDirection, setLanguageDirection] = useState("es-to-en"); // "es-to-en" or "en-to-es"
  const [numSentences, setNumSentences] = useState(5);
  const [wordsCount, setWordsCount] = useState(5);
  const [sentences, setSentences] = useState([]);
  const [sentencesWithWords, setSentencesWithWords] = useState([]);
  const [usedWords, setUsedWords] = useState([]);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [translations, setTranslations] = useState({});
  const [results, setResults] = useState({});
  const [revealed, setRevealed] = useState({});
  const [generating, setGenerating] = useState(false);
  const [checkingIdx, setCheckingIdx] = useState(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);

  // Generation settings collapse state
  const [showGenerationSettings, setShowGenerationSettings] = useState(false);

  // Profile dropdown state
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Statistics panel state
  const [showStatistics, setShowStatistics] = useState(false);

  // Header scroll state
  const [headerVisible, setHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const dropdownPadding = showTopicDropdown ? 220 : (showSentenceTypeDropdown || showTenseDropdown) ? 150 : 0;

  useEffect(() => {
    setAuthHeader(token);
    if (token) {
      fetchMe();
    } else {
      setUser(null);
      setWords([]);
      setProgress(null);
    }
  }, [token]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowLevelDropdown(false);
      setShowLengthDropdown(false);
      setShowTopicDropdown(false);
      setShowSentenceTypeDropdown(false);
      setShowTenseDropdown(false);
      setShowWordsCountDropdown(false);
      setShowProfileDropdown(false);
    };
    if (showLevelDropdown || showLengthDropdown || showTopicDropdown || showSentenceTypeDropdown || showTenseDropdown || showWordsCountDropdown || showProfileDropdown) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showLevelDropdown, showLengthDropdown, showTopicDropdown, showSentenceTypeDropdown, showTenseDropdown, showWordsCountDropdown, showProfileDropdown]);

  useEffect(() => {
    if (!showGenerationSettings) {
      setShowLevelDropdown(false);
      setShowLengthDropdown(false);
      setShowTopicDropdown(false);
      setShowSentenceTypeDropdown(false);
      setShowTenseDropdown(false);
      setShowWordsCountDropdown(false);
    }
  }, [showGenerationSettings]);

  // Header scroll hide/show effect
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 10) {
        // Always show header at the top
        setHeaderVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down - hide header
        setHeaderVisible(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - show header
        setHeaderVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const fetchMe = async () => {
    if (!token) return;
    setLoadingWords(true);
    try {
      const [meRes, wordsRes, progressRes] = await Promise.all([
        api.get("/auth/me/"),
        api.get("/words/"),
        api.get("/progress/"),
      ]);

      setUser(meRes.data);
      const wordsPayload = wordsRes.data;
      const nextWords = Array.isArray(wordsPayload)
        ? wordsPayload
        : Array.isArray(wordsPayload?.results)
          ? wordsPayload.results
          : [];
      setWords(nextWords);
      setProgress(progressRes.data || null);
    } catch (err) {
      console.error(err);
      setUser(null);
      setToken("");
    } finally {
      setLoadingWords(false);
    }
  };

  const fetchProgress = async () => {
    if (!token) return;
    try {
      const res = await api.get("/progress/");
      setProgress(res.data || null);
    } catch (err) {
      // ignore
    }
  };

  const register = async (email, password) => {
    setAuthError("");
    setInfo("");
    setRegisterEmail(email);
    setRegisterPassword(password);
    try {
      await api.post("/auth/register/", { email, password });
      setNeedsRegCode(true);
      setInfo("Verification code sent to your email");
    } catch (err) {
      setAuthError(err.response?.data?.detail || "Registration failed");
      throw err;
    }
  };

  const verifyRegistration = async () => {
    setAuthError("");
    try {
      const res = await api.post("/auth/verify-registration/", { email: registerEmail, code: registerCode });
      setToken(res.data.token);
      setUser(res.data.user);
      setNeedsRegCode(false);
      setAuthPage(null);
      setInfo("Registration complete!");
    } catch (err) {
      setAuthError(err.response?.data?.detail || "Invalid code");
    }
  };

  const loginUser = async (email, password) => {
    setAuthError("");
    setNeeds2FA(false);
    setLoginEmail(email);
    setLoginPassword(password);
    try {
      const res = await api.post("/auth/login/", { email, password });
      if (res.data.requires_2fa) {
        setNeeds2FA(true);
        setInfo("2FA code sent");
      } else {
        setToken(res.data.token);
        setUser(res.data.user);
        setAuthPage(null);
        setInfo("Logged in successfully");
      }
    } catch (err) {
      setAuthError(err.response?.data?.detail || "Login failed");
      throw err;
    }
  };

  const verify2FA = async () => {
    setAuthError("");
    try {
      const res = await api.post("/auth/verify-2fa/", { email: loginEmail, code: loginCode });
      setToken(res.data.token);
      setUser(res.data.user);
      setNeeds2FA(false);
      setAuthPage(null);
      setInfo("2FA verified");
    } catch (err) {
      setAuthError(err.response?.data?.detail || "Invalid code");
    }
  };

  const logoutUser = async () => {
    try {
      await api.post("/auth/logout/");
    } catch (err) {
      // ignore
    }
    setToken("");
    setUser(null);
    setWords([]);
    setSelectedWords([]);
    setNewWord("");
    setSentences([]);
    setTranslations({});
    setResults({});
    setRevealed({});
    setProgress(null);
    setShowProfileDropdown(false);
  };

  const toggle2FA = async () => {
    if (!token) return;
    setAuthError("");
    setInfo("");
    try {
      const currentlyEnabled = Boolean(user?.profile?.two_factor_enabled);
      const nextEnabled = !currentlyEnabled;
      const res = await api.post("/auth/toggle-2fa/", { enabled: nextEnabled });
      const enabledFromServer = Boolean(res.data?.two_factor_enabled);
      setUser((prev) =>
        prev
          ? {
              ...prev,
              profile: {
                ...(prev.profile || {}),
                two_factor_enabled: enabledFromServer,
              },
            }
          : prev
      );
      setInfo(enabledFromServer ? "2FA enabled" : "2FA disabled");
    } catch (err) {
      setAuthError(err.response?.data?.detail || "Failed to toggle 2FA");
    }
  };

  const toggleStatistics = () => {
    setShowStatistics((prev) => {
      const next = !prev;
      if (next) fetchProgress();
      return next;
    });
    setShowProfileDropdown(false);
  };

  const addWord = async () => {
    const text = (newWord || "").trim();
    if (!text) return;
    try {
      const res = await api.post("/words/", { text });
      setWords((prev) => {
        const list = Array.isArray(prev)
          ? prev
          : Array.isArray(prev?.results)
            ? prev.results
            : [];
        return [res.data, ...list];
      });
      setNewWord("");
    } catch (err) {
      const message =
        err.response?.data?.text?.[0] ||
        err.response?.data?.detail ||
        "Failed to add word";
      setAuthError(message);
    }
  };

  const toggleWordSelection = (text) => {
    const value = String(text || "");
    if (!value) return;
    setSelectedWords((prev) =>
      prev.includes(value) ? prev.filter((w) => w !== value) : [...prev, value]
    );
  };

  const removeWord = async (id) => {
    await api.delete(`/words/${id}/`);
    setWords((prev) => prev.filter((w) => w.id !== id));
  };

  const updateWord = async (id, text) => {
    const res = await api.put(`/words/${id}/`, { text });
    setWords((prev) => prev.map((w) => (w.id === id ? res.data : w)));
  };

  const handleGenerate = async () => {
    const effectiveWordsCount = wordsCount === '' ? 5 : wordsCount;
    setGenerating(true);
    setResults({});
    setTranslations({});
    setRevealed({});
    try {
      const res = await api.post("/generate/", {
        level,
        length,
        topic,
        sentence_type: sentenceType,
        tense,
        grammar_focus: grammarFocusEnabled && grammarFocus.trim() ? grammarFocus.trim() : undefined,
        language_direction: languageDirection,
        num_sentences: numSentences,
        words_count: effectiveWordsCount,
        specific_words: selectedWords.length > 0 ? selectedWords : undefined,
      });
      setSentences(res.data.sentences || []);
      setSentencesWithWords(res.data.sentences_with_words || []);
      setUsedWords(res.data.words_used || []);
      setSessionInfo(res.data.session || null);
      if (res.data.used_genai === false) {
        setInfo("Generated in offline mode");
      } else {
        setInfo("Generated with AI");
      }

      fetchProgress();
    } catch (err) {
      setAuthError(err.response?.data?.detail || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleCheck = async (sentence, idx) => {
    const translation = translations[idx] || "";
    if (!translation.trim()) return;
    setCheckingIdx(idx);
    try {
      const res = await api.post("/check/", {
        sentence,
        translation,
        language_direction: languageDirection,
      });
      setResults((prev) => ({ ...prev, [idx]: res.data }));
      fetchProgress();
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingIdx(null);
    }
  };

  const handleReveal = async (sentence, idx) => {
    setCheckingIdx(idx);
    try {
      const res = await api.post("/check/", {
        sentence,
        translation: "", // empty translation to get correct answer
        language_direction: languageDirection,
      });
      setRevealed((prev) => ({ ...prev, [idx]: res.data.correct_translation }));
      fetchProgress();
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingIdx(null);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setChatLoading(true);
    
    try {
      const res = await api.post("/chat/", { message: userMessage });
      setChatMessages((prev) => [...prev, { role: "assistant", content: res.data.response }]);
    } catch (err) {
      setChatMessages((prev) => [...prev, { 
        role: "assistant", 
        content: "Sorry, I couldn't process your request. Please try again." 
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleResizeStart = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    if (!isResizing) {
      document.body.classList.remove('resizing');
      return;
    }

    document.body.classList.add('resizing');

    const handleMouseMove = (e) => {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 320 && newWidth <= 800) {
        setChatWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.classList.remove('resizing');
    };
  }, [isResizing]);

  const generatedList = useMemo(
    () =>
      sentences.map((sentence, idx) => ({
        idx,
        sentence,
        translation: translations[idx] || "",
        result: results[idx],
        revealed: revealed[idx],
      })),
    [sentences, translations, results, revealed]
  );

  const allTranslated = useMemo(() => {
    if (sentences.length === 0) return false;
    return sentences.every((_, idx) => results[idx] || revealed[idx]);
  }, [sentences, results, revealed]);

  const filteredWords = useMemo(() => {
    const query = wordSearch.trim().toLowerCase();
    const list = Array.isArray(words)
      ? words
      : Array.isArray(words?.results)
        ? words.results
        : [];

    if (!query) return list;
    return list.filter((w) => String(w?.text ?? "").toLowerCase().includes(query));
  }, [words, wordSearch]);

  const authenticated = Boolean(user && token);

  // Show auth pages
  if (authPage === "login") {
    if (needs2FA) {
      return (
        <VerifyCode
          email={loginEmail}
          onVerify={async (code) => {
            setAuthError("");
            try {
              const res = await api.post("/auth/verify-2fa/", { email: loginEmail, code });
              setToken(res.data.token);
              setUser(res.data.user);
              setNeeds2FA(false);
              setAuthPage(null);
              setInfo("2FA verified");
            } catch (err) {
              setAuthError(err.response?.data?.detail || "Invalid code");
            }
          }}
          onResend={async () => {
            await loginUser(loginEmail, loginPassword);
          }}
          error={authError}
          type="2fa"
        />
      );
    }
    return <Login onLogin={loginUser} onSwitchToSignup={() => setAuthPage("signup")} error={authError} />;
  }

  if (authPage === "signup") {
    if (needsRegCode) {
      return (
        <VerifyCode
          email={registerEmail}
          onVerify={async (code) => {
            setAuthError("");
            try {
              const res = await api.post("/auth/verify-registration/", { email: registerEmail, code });
              setToken(res.data.token);
              setUser(res.data.user);
              setNeedsRegCode(false);
              setAuthPage(null);
              setInfo("Registration complete!");
            } catch (err) {
              setAuthError(err.response?.data?.detail || "Invalid code");
            }
          }}
          onResend={async () => {
            await register(registerEmail, registerPassword);
          }}
          error={authError}
          type="registration"
        />
      );
    }
    return <Signup onSignup={register} onSwitchToLogin={() => setAuthPage("login")} error={authError} />;
  }

  return (
    <div className="app-shell">
      <header className={`header ${headerVisible ? 'visible' : 'hidden'}`}>
        <div className="header-left header-shift-right">
          <h1 className="logo">LinguaBoost</h1>
          <p className="tagline">Learn Languages with AI-Powered Lessons</p>
        </div>
        <div className="header-right header-shift-left">
          {authenticated ? (
            <>
              {progress && (
                <div className="progress-pills" title="Your progress">
                  <span className="progress-pill">
                    Streak <strong>{progress.current_streak}</strong>
                  </span>
                  <span className="progress-pill">
                    Accuracy <strong>{Math.round((progress.accuracy || 0) * 100)}%</strong>
                  </span>
                  <span className="progress-pill">
                    Attempts <strong>{progress.attempts_total}</strong>
                  </span>
                </div>
              )}
              <div className="profile-dropdown-container">
              <div 
                className="profile-avatar"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProfileDropdown(!showProfileDropdown);
                }}
              >
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              {showProfileDropdown && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-header">
                    <div className="profile-dropdown-email">{user?.email}</div>
                    <div className="profile-dropdown-badges">
                      {user?.profile?.is_verified && <span className="badge-mini verified">Verified</span>}
                      {user?.profile?.two_factor_enabled && <span className="badge-mini">2FA</span>}
                    </div>
                  </div>
                  <div className="profile-dropdown-divider"></div>
                  <button className="profile-dropdown-item" onClick={toggle2FA}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    {user?.profile?.two_factor_enabled ? "Disable" : "Enable"} 2FA
                  </button>
                  <div className="profile-dropdown-divider"></div>
                  <button className="profile-dropdown-item" onClick={toggleStatistics}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="20" x2="12" y2="10"></line>
                      <line x1="18" y1="20" x2="18" y2="4"></line>
                      <line x1="6" y1="20" x2="6" y2="16"></line>
                    </svg>
                    {showStatistics ? "Hide" : "Show"} Statistics
                  </button>
                  <div className="profile-dropdown-divider"></div>
                  <button className="profile-dropdown-item danger" onClick={logoutUser}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
            </>
          ) : (
            <button className="button-primary" onClick={() => setAuthPage("login")}>
              Login / Register
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      {!authenticated && (
        <div className="hero">
          <h2 className="hero-title">Start Your Spanish Learning Journey</h2>
          <p className="hero-subtitle">Generate AI-powered sentences, build your vocabulary, and master translations</p>
          <button className="button-hero" onClick={() => setAuthPage("signup")}>
            Get Started Free
          </button>
        </div>
      )}

      {authenticated && (
        <>
          <div className="dashboard-grid">
            <div className="dashboard-sidebar">
              <div className={`card generation-card ${showGenerationSettings ? "expanded" : ""}`}>
                <div
                  className="card-header dark generation-card-header clickable"
                  onClick={() => setShowGenerationSettings((prev) => !prev)}
                >
                  <div className="generation-title">
                    <h3>Generation Settings</h3>
                  </div>
                  <div className="generation-toggle">
                    <svg className={`collapse-arrow ${showGenerationSettings ? "open" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>

                <div
                  className={`card-body generation-card-body ${showGenerationSettings ? "expanded" : "collapsed"}`}
                  style={dropdownPadding ? { paddingBottom: dropdownPadding, maxHeight: "1400px" } : undefined}
                >
                    <div className="field" style={{ marginBottom: '20px' }}>
                      <label>Translation Direction</label>
                      <button 
                        className="button-secondary button-full" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setLanguageDirection(prev => prev === "es-to-en" ? "en-to-es" : "es-to-en");
                        }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      >
                        {languageDirection === "es-to-en" ? (
                          <span>Spanish → English</span>
                        ) : (
                          <span>English → Spanish</span>
                        )}
                      </button>
                    </div>
                    <div className="settings-grid">
                      <div className="field">
                        <label>Level</label>
                            <div className="custom-select-wrapper">
                          <div 
                            className="custom-select" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowLengthDropdown(false);
                              setShowTopicDropdown(false);
                              setShowSentenceTypeDropdown(false);
                              setShowWordsCountDropdown(false);
                              setShowLevelDropdown((prev) => !prev);
                            }}
                          >
                            <span>{level}</span>
                            <svg className="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </div>
                          {showLevelDropdown && (
                            <div className="custom-dropdown">
                              {levelOptions.map((lvl) => (
                                <div
                                  key={lvl}
                                  className={`dropdown-option ${level === lvl ? "selected" : ""}`}
                                  onClick={() => {
                                    setLevel(lvl);
                                    setShowLevelDropdown(false);
                                  }}
                                >
                                  {lvl}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="field">
                        <label>Length</label>
                            <div className="custom-select-wrapper">
                          <div 
                            className="custom-select" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowLevelDropdown(false);
                              setShowTopicDropdown(false);
                              setShowSentenceTypeDropdown(false);
                              setShowWordsCountDropdown(false);
                              setShowLengthDropdown((prev) => !prev);
                            }}
                          >
                            <span>{lengthOptions.find(opt => opt.value === length)?.label || length}</span>
                            <svg className="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </div>
                          {showLengthDropdown && (
                            <div className="custom-dropdown">
                              {lengthOptions.map((opt) => (
                                <div
                                  key={opt.value}
                                  className={`dropdown-option ${length === opt.value ? "selected" : ""}`}
                                  onClick={() => {
                                    setLength(opt.value);
                                    setShowLengthDropdown(false);
                                  }}
                                >
                                  {opt.label}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="field">
                        <label>Sentences</label>
                        <input
                          className="input"
                          type="number"
                          min={1}
                          max={10}
                          value={numSentences}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              setNumSentences('');
                            } else {
                              const num = parseInt(val, 10);
                              if (!isNaN(num)) setNumSentences(num);
                            }
                          }}
                          onBlur={(e) => {
                            if (e.target.value === '' || e.target.value < 1) {
                              setNumSentences(1);
                            }
                          }}
                        />
                      </div>
                      <div className="field">
                        <label>Words to use</label>
                        <div className="words-count-control">
                          <input
                            className="input words-count-input"
                            type="number"
                            min={1}
                            max={words.length || 100}
                            value={wordsCount === 'all' ? '' : wordsCount}
                            placeholder="Words to use"
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '') {
                                setWordsCount('');
                              } else {
                                const num = parseInt(val, 10);
                                if (!isNaN(num)) setWordsCount(num);
                              }
                            }}
                            onBlur={(e) => {
                              if (e.target.value === '' || Number(e.target.value) < 1) {
                                setWordsCount(5);
                              }
                            }}
                          />
                        </div>
                      </div>
                      <div className="field">
                        <label>Topic</label>
                        <div className="custom-select-wrapper">
                          <div 
                            className="custom-select" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowLevelDropdown(false);
                              setShowLengthDropdown(false);
                              setShowSentenceTypeDropdown(false);
                              setShowWordsCountDropdown(false);
                              setShowTopicDropdown((prev) => !prev);
                            }}
                          >
                            <span>{topicOptions.find(opt => opt.value === topic)?.label || topic}</span>
                            <svg className="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </div>
                          {showTopicDropdown && (
                            <div className="custom-dropdown">
                              {topicOptions.map((opt) => (
                                <div
                                  key={opt.value}
                                  className={`dropdown-option ${topic === opt.value ? "selected" : ""}`}
                                  onClick={() => {
                                    setTopic(opt.value);
                                    setShowTopicDropdown(false);
                                  }}
                                >
                                  {opt.label}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="field">
                        <label>Sentence Type</label>
                        <div className="custom-select-wrapper">
                          <div 
                            className="custom-select" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowLevelDropdown(false);
                              setShowLengthDropdown(false);
                              setShowTopicDropdown(false);
                              setShowTenseDropdown(false);
                              setShowWordsCountDropdown(false);
                              setShowSentenceTypeDropdown((prev) => !prev);
                            }}
                          >
                            <span>{sentenceTypeOptions.find(opt => opt.value === sentenceType)?.label || sentenceType}</span>
                            <svg className="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </div>
                          {showSentenceTypeDropdown && (
                            <div className="custom-dropdown">
                              {sentenceTypeOptions.map((opt) => (
                                <div
                                  key={opt.value}
                                  className={`dropdown-option ${sentenceType === opt.value ? "selected" : ""}`}
                                  onClick={() => {
                                    setSentenceType(opt.value);
                                    setShowSentenceTypeDropdown(false);
                                  }}
                                >
                                  {opt.label}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="field">
                        <label>Tense</label>
                        <div className="custom-select-wrapper">
                          <div
                            className="custom-select"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowLevelDropdown(false);
                              setShowLengthDropdown(false);
                              setShowTopicDropdown(false);
                              setShowSentenceTypeDropdown(false);
                              setShowWordsCountDropdown(false);
                              setShowTenseDropdown((prev) => !prev);
                            }}
                          >
                            <span>{tenseOptions.find((opt) => opt.value === tense)?.label || tense}</span>
                            <svg className="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </div>
                          {showTenseDropdown && (
                            <div className="custom-dropdown">
                              {tenseOptions.map((opt) => (
                                <div
                                  key={opt.value}
                                  className={`dropdown-option ${tense === opt.value ? "selected" : ""}`}
                                  onClick={() => {
                                    setTense(opt.value);
                                    setShowTenseDropdown(false);
                                  }}
                                >
                                  {opt.label}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="field" style={{ gridColumn: "1 / -1" }}>
                        <label>Controlled grammar target</label>
                        <button
                          className="button-secondary button-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            setGrammarFocusEnabled((prev) => !prev);
                          }}
                          type="button"
                        >
                          {grammarFocusEnabled ? "On" : "Off"}
                        </button>
                        {grammarFocusEnabled && (
                          <input
                            className="input"
                            style={{ marginTop: 10 }}
                            value={grammarFocus}
                            onChange={(e) => setGrammarFocus(e.target.value)}
                            placeholder="What do you want to practice? e.g., ser vs estar, preterite vs imperfect, por vs para"
                          />
                        )}
                      </div>
                    </div>
                    <button className="button-primary button-full" onClick={(e) => { e.stopPropagation(); handleGenerate(); }} disabled={generating}>
                      {generating ? "Generating..." : "Generate Sentences"}
                    </button>
                    {usedWords.length > 0 && (
                      <div className="used-words">
                        <span className="used-words-label">Using words:</span>
                        {usedWords.map((w, idx) => (
                          <span key={`${w}-${idx}`} className="word-badge">
                            {w}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
              </div>

            <div className="card dictionary-card">
              <div className="card-header dark">
                <h3>Dictionary</h3>
                <span className="word-count">{words.length} words</span>
              </div>
              <div className="card-body">
                <div className="input-group">
                  <div className="search-input-wrapper">
                    <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      className="input search-input"
                      placeholder="Search word..."
                      value={wordSearch}
                      onChange={(e) => setWordSearch(e.target.value)}
                    />
                  </div>
                  <div className="add-input-wrapper">
                    <svg className="add-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <input
                      className="input add-input"
                      placeholder="Add a word... e.g., desayuno"
                      value={newWord}
                      onChange={(e) => setNewWord(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newWord.trim()) {
                          e.preventDefault();
                          addWord();
                        }
                      }}
                    />
                  </div>
                  <button className="button-primary" onClick={addWord} disabled={!newWord.trim()}>
                    Add
                  </button>
                </div>
                <div className="word-list">
                  {loadingWords && <span className="loading">Loading words...</span>}
                  {!loadingWords && words.length === 0 && <p className="empty-state">No words yet. Add your first word!</p>}
                  {!loadingWords && words.length > 0 && filteredWords.length === 0 && (
                    <p className="empty-state">No matches for "{wordSearch}"</p>
                  )}
                  {!loadingWords &&
                    filteredWords.map((word) => (
                      <WordChip 
                        key={word.id} 
                        word={word} 
                        onDeleteRequest={() => setDeleteTarget(word)} 
                        onUpdate={updateWord} 
                        selected={selectedWords.includes(word.text)}
                        onToggleSelect={toggleWordSelection}
                      />
                    ))}
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-main">
            {showStatistics && (
              <div className="card statistics-card">
                <div className="card-header dark statistics-header">
                  <h3>Statistics</h3>
                  <button className="button-secondary" type="button" onClick={() => setShowStatistics(false)}>
                    Close
                  </button>
                </div>
                <div className="card-body">
                  {!progress ? (
                    <p className="empty-state">No statistics yet.</p>
                  ) : (
                    (() => {
                      const accuracyPct = Math.round((progress.accuracy || 0) * 100);
                      const attempts = Number(progress.attempts_total || 0);
                      const correct = Number(progress.correct_total ?? Math.round(attempts * (progress.accuracy || 0)));
                      const wrong = Math.max(0, attempts - correct);
                      const currentStreak = Number(progress.current_streak || 0);
                      const longestStreak = Number(progress.longest_streak || 0);
                      const streakMax = Math.max(1, currentStreak, longestStreak);

                      return (
                        <div className="stats-grid">
                          <div className="stats-card">
                            <div className="stats-card-title">Accuracy</div>
                            <div className="stats-help">
                              Attempts count only when you submit a non-empty answer and press Check. Reveals without an answer don’t affect accuracy.
                            </div>
                            <div className="stats-pie-row">
                              <div className="stats-pie" style={{ "--p": `${accuracyPct}%` }} aria-label={`Accuracy ${accuracyPct}%`}></div>
                              <div className="stats-legend">
                                <div className="stats-legend-row">
                                  <span className="stats-dot correct"></span>
                                  <span>Correct</span>
                                  <strong>{correct}</strong>
                                </div>
                                <div className="stats-legend-row">
                                  <span className="stats-dot wrong"></span>
                                  <span>Wrong</span>
                                  <strong>{wrong}</strong>
                                </div>
                                <div className="stats-legend-row">
                                  <span className="stats-dot neutral"></span>
                                  <span>Accuracy</span>
                                  <strong>{accuracyPct}%</strong>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="stats-card">
                            <div className="stats-card-title">Streaks</div>
                            <div className="stats-help">
                              Streaks are based on days you generated a session (i.e., generated sentences).
                            </div>
                            <div className="stats-bars">
                              <div className="stats-bar-col">
                                <div className="stats-bar" style={{ height: `${Math.round((currentStreak / streakMax) * 100)}%` }}></div>
                                <div className="stats-bar-label">
                                  <div>Current</div>
                                  <strong>{currentStreak}</strong>
                                </div>
                              </div>
                              <div className="stats-bar-col">
                                <div className="stats-bar" style={{ height: `${Math.round((longestStreak / streakMax) * 100)}%` }}></div>
                                <div className="stats-bar-label">
                                  <div>Best</div>
                                  <strong>{longestStreak}</strong>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="stats-card stats-metrics">
                            <div className="stats-metric">
                              <div className="stats-metric-label">Words</div>
                              <div className="stats-metric-value">{progress.words_total}</div>
                            </div>
                            <div className="stats-metric">
                              <div className="stats-metric-label">Attempts</div>
                              <div className="stats-metric-value">{progress.attempts_total}</div>
                            </div>
                            <div className="stats-metric">
                              <div className="stats-metric-label">Sessions</div>
                              <div className="stats-metric-value">{progress.sessions_total}</div>
                            </div>
                            <div className="stats-metric">
                              <div className="stats-metric-label">Days practiced</div>
                              <div className="stats-metric-value">{progress.days_practiced}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            )}
            <div className="card training-card">
            <div className="card-header dark">
              <h3>Translation Training</h3>
              {sentences.length > 0 && (
                <span className="progress-badge">
                  {Object.keys(results).length + Object.keys(revealed).length} / {sentences.length} completed
                </span>
              )}
            </div>
            <div className="card-body">
              {generatedList.length === 0 && (
                <div className="empty-state-large">
                  <h4>Ready to practice?</h4>
                  <p>Generate sentences above to start your training session</p>
                </div>
              )}
              {generatedList.map(({ sentence, translation, result, revealed: rev, idx }) => {
                const statusLabel = result
                  ? result.is_correct
                    ? "Correct"
                    : "Wrong"
                  : rev
                  ? "Wrong"
                  : "Awaiting answer";
                const statusClass = result
                  ? result.is_correct
                    ? "status-correct"
                    : "status-wrong"
                  : rev
                  ? "status-wrong"
                  : "status-pending";
                return (
                  <div key={idx} className="sentence-card">
                    <div className="sentence-card-header">
                      <span className="sentence-pill">#{idx + 1}</span>
                      <span className={`sentence-status ${statusClass}`}>{statusLabel}</span>
                    </div>

                    <div className="sentence-card-body">
                      <div className="sentence-text">{sentence}</div>
                      {sentencesWithWords[idx] && sentencesWithWords[idx].words_found && sentencesWithWords[idx].words_found.length > 0 && (
                        <div className="used-words-container">
                          <span className="used-words-label">Words used:</span>
                          {sentencesWithWords[idx].words_found.map((word, wordIdx) => (
                            <span key={wordIdx} className="used-word-tag">{word}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="sentence-card-panel">
                      {!result && !rev && (
                        <>
                          <label className="sentence-input-label">
                            {languageDirection === "es-to-en" ? "Your English translation" : "Your Spanish translation"}
                          </label>
                          <textarea
                            className="textarea"
                            rows={2}
                            placeholder={languageDirection === "es-to-en" ? "Type your English translation here..." : "Type your Spanish translation here..."}
                            value={translation}
                            onChange={(e) =>
                              setTranslations((prev) => ({
                                ...prev,
                                [idx]: e.target.value,
                              }))
                            }
                          />
                          <div className="sentence-actions">
                            <button
                              className="button-primary"
                              onClick={() => handleCheck(sentence, idx)}
                              disabled={!translation.trim() || checkingIdx === idx}
                            >
                              {checkingIdx === idx ? "Checking..." : "Check Answer"}
                            </button>
                            <button
                              className="button-secondary danger"
                              onClick={() => handleReveal(sentence, idx)}
                              disabled={checkingIdx === idx}
                            >
                              {checkingIdx === idx ? "Loading..." : "I Don't Know"}
                            </button>
                          </div>
                        </>
                      )}

                      {result && (
                        <div className={`result unified-result ${result.is_correct ? "correct" : "incorrect"}`}>
                          <div className="result-status">
                            {result.is_correct ? "Correct" : "Not quite right"}
                          </div>
                          {translation && (
                            <div className="result-translation">
                              <span className="result-label">Your answer</span>
                              <span>{translation}</span>
                            </div>
                          )}
                          {!result.is_correct && (
                            <div className="result-translation">
                              <span className="result-label">Correct answer</span>
                              <span>{result.correct_translation}</span>
                            </div>
                          )}
                          {result.explanation && (
                            <div className="result-explanation">{result.explanation}</div>
                          )}
                        </div>
                      )}

                      {rev && !result && (
                        <div className="result unified-result revealed">
                          <div className="result-status">Answer Revealed</div>
                          <div className="result-translation">
                            <span className="result-label">Translation</span>
                            <span>{rev}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {allTranslated && sentences.length > 0 && (
                <div className="regenerate-section">
                  <h4>
                    Great job! All sentences completed
                    <span className="score-badges">
                      <span className="score-badge correct">{Object.values(results).filter(r => r?.is_correct).length} correct</span>
                      <span className="score-badge incorrect">{sentences.length - Object.values(results).filter(r => r?.is_correct).length} wrong</span>
                    </span>
                  </h4>
                  <button className="button-hero" onClick={handleGenerate} disabled={generating}>
                    {generating ? "Generating..." : "Generate New Sentences"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Floating Chat Button */}
      {authenticated && !chatOpen && (
        <button 
          className="chat-toggle-button" 
          onClick={() => setChatOpen(true)}
          aria-label="Open AI Chat"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
      )}

      {/* Sliding Chat Panel */}
      {authenticated && (
        <div className={`chat-panel ${chatOpen ? 'open' : ''}`} style={{ width: `${chatWidth}px` }}>
          <div 
            className="chat-resize-handle"
            onMouseDown={handleResizeStart}
          />
          <div className="chat-panel-header">
            <h3>LinguaBoost AI</h3>
            <button className="chat-close-button" onClick={() => setChatOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <div className="chat-panel-messages">
            {chatMessages.length === 0 && (
              <div className="chat-welcome">
                <h4>Ask me anything!</h4>
                <p>I can help with Spanish grammar, vocabulary, pronunciation, and more.</p>
                <div className="chat-suggestions">
                  <p><strong>Try asking:</strong></p>
                  <button className="chat-suggestion" onClick={() => setChatInput("What's the difference between 'ser' and 'estar'?")}>
                    What's the difference between "ser" and "estar"?
                  </button>
                  <button className="chat-suggestion" onClick={() => setChatInput("How do I conjugate 'hablar' in the past tense?")}>
                    How do I conjugate "hablar" in the past?
                  </button>
                  <button className="chat-suggestion" onClick={() => setChatInput("What are some common Spanish idioms?")}>
                    What are some common Spanish idioms?
                  </button>
                </div>
              </div>
            )}
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.role}`}>
                <div className="chat-message-content">
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="chat-message assistant">
                <div className="chat-message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="chat-panel-input">
            <input
              type="text"
              className="chat-input"
              placeholder="Ask a question..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendChatMessage()}
              disabled={chatLoading}
            />
            <button 
              className="chat-send-button" 
              onClick={sendChatMessage}
              disabled={chatLoading || !chatInput.trim()}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete word?</h3>
              <button className="modal-close" onClick={() => setDeleteTarget(null)}>×</button>
            </div>
            <div className="modal-body">
              <p>Remove "{deleteTarget.text}" from your dictionary?</p>
              <p className="modal-subtext">This cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button className="button-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button
                className="button-danger"
                onClick={async () => {
                  await removeWord(deleteTarget.id);
                  setDeleteTarget(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WordChip({ word, onDeleteRequest, onUpdate, selected, onToggleSelect }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(word.text);

  const save = async () => {
    if (!value.trim()) return;
    await onUpdate(word.id, value.trim());
    setEditing(false);
  };

  return (
    <div 
      className={`word-chip ${selected ? 'selected' : ''}`}
      onDoubleClick={() => onToggleSelect(word.text)}
      title="Double click to select/deselect for generation"
    >
      {editing ? (
        <input
          className="word-chip-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyPress={(e) => e.key === "Enter" && save()}
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="word-chip-text">{word.text}</span>
      )}
      <button className="word-chip-btn edit" onClick={(e) => { e.stopPropagation(); setEditing((v) => !v); }}>
        {editing ? "save" : "edit"}
      </button>
      {!editing && (
        <button className="word-chip-btn delete" onClick={(e) => { e.stopPropagation(); onDeleteRequest(); }}>
          ×
        </button>
      )}
    </div>
  );
}
