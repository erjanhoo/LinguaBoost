import { useState, useRef, useEffect } from "react";
import axios from "axios";
import LanguageInput from "./LanguageInput";

export default function ProfileSettings({ user, progress, onLogout, onClose, onUpdate }) {
  const [activeTab, setActiveTab] = useState("profile");
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form States
  const [nativeLang, setNativeLang] = useState("");
  const [targetLang, setTargetLang] = useState("");
  const [bio, setBio] = useState("");
  const [learningGoal, setLearningGoal] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [file, setFile] = useState(null);

  // Security States
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Header scroll state
  const [headerVisible, setHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  const fileInputRef = useRef(null);

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 10) {
        setHeaderVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setHeaderVisible(false);
      } else if (currentScrollY < lastScrollY) {
        setHeaderVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Fetch latest data on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      const res = await axios.get("/api/auth/me/", {
        headers: { Authorization: `Token ${token}` }
      });
      
      const profile = res.data.profile || {};
      setNativeLang(profile.native_language || "English");
      setTargetLang(profile.target_language || "Spanish");
      setBio(profile.bio || "");
      setLearningGoal(profile.learning_goal || "");
      setTwoFactorEnabled(profile.two_factor_enabled || false);
      setPreviewUrl(profile.profile_picture || null);
      if(profile.profile_picture && !profile.profile_picture.startsWith("http")) {
          // If relative path, use the proxy
      }
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to load profile data.");
      setIsLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
        setFile(selectedFile);
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result);
        };
        reader.readAsDataURL(selectedFile);
    }
  };

  const saveProfile = async () => {
    const formData = new FormData();
    formData.append("native_language", nativeLang);
    formData.append("target_language", targetLang);
    formData.append("bio", bio);
    formData.append("learning_goal", learningGoal);
    if (file) {
      formData.append("profile_picture", file);
    }

    try {
      const res = await axios.patch("/api/auth/me/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Token ${localStorage.getItem("token")}`,
        },
      });
      setMessage("Profile saved successfully!");
      setError("");
      
      // Update local preview immediately if file was uploaded, OR use the server response
      if (res.data.profile && res.data.profile.profile_picture) {
         setPreviewUrl(res.data.profile.profile_picture);
      }

      onUpdate(); // refresh app state
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setError("Failed to save profile.");
    }
  };

  const saveSecurity = async () => {
    const token = localStorage.getItem("token");
    setMessage("");
    setError("");

    // Change Password
    if (oldPassword || newPassword) {
        if (newPassword !== confirmPassword) {
            setError("New passwords do not match.");
            return;
        }
        try {
            await axios.post("/api/auth/change-password/", {
                old_password: oldPassword,
                new_password: newPassword
            }, {
                headers: { Authorization: `Token ${token}` }
            });
            setMessage("Password changed successfully.");
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to change password.");
            return;
        }
    }

    // Toggle 2FA
    try {
        await axios.post("/api/auth/toggle-2fa/", {
            enabled: twoFactorEnabled
        }, {
            headers: { Authorization: `Token ${token}` }
        });
        if (!message) setMessage("Security settings updated.");
    } catch (err) {
        if (!error) setError("Failed to update 2FA settings.");
    }
  };

  if (isLoading) return <div className="loading-spinner">Loading settings...</div>;

  return (
    <>
      <header className={`header ${headerVisible ? 'visible' : 'hidden'}`} style={{ position: "fixed", top: 0, zIndex: 100, width: "100%" }}>
        <div className="header-left header-shift-right" style={{ cursor: "pointer" }} onClick={onClose}>
          <h1 className="logo">LinguaBoost</h1>
          <p className="tagline">Learn Languages with AI-Powered Lessons</p>
        </div>
        <div className="header-right header-shift-left">
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
                <button className="profile-dropdown-item" onClick={() => { setShowProfileDropdown(false); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2 .83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                    Profile Settings
                </button>
                <div className="profile-dropdown-divider"></div>
                <button className="profile-dropdown-item" onClick={onLogout}>
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
        </div>
      </header>

    <div className="settings-dashboard animate-fade-in" style={{ marginTop: '120px' }}>
      <div className="settings-sidebar">
        <div className="sidebar-title">Settings</div>
        <div className="sidebar-nav">
          <button 
            className={`sidebar-btn ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            Public Profile
          </button>
          <button 
            className={`sidebar-btn ${activeTab === "learning" ? "active" : ""}`}
            onClick={() => setActiveTab("learning")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
            Learning Goals
          </button>
          <button 
            className={`sidebar-btn ${activeTab === "security" ? "active" : ""}`}
            onClick={() => setActiveTab("security")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            Password & Security
          </button>
        </div>
        
        <div style={{ marginTop: 'auto' }}>
            <button className="sidebar-btn" onClick={onClose} style={{ color: '#dc3545' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                Close Settings
            </button>
        </div>
      </div>

      <div className="settings-content">
        {activeTab === "profile" && (
            <div className="animate-slide-up">
                <h2>Public Profile</h2>
                
                <div className="profile-header">
                     <img 
                        src={previewUrl || "https://via.placeholder.com/80"} 
                        alt="Profile" 
                        className="large-avatar"
                     />
                     <div className="avatar-actions">
                        <button className="btn-upload" onClick={() => fileInputRef.current.click()}>
                            Change Photo
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            hidden 
                            accept="image/*"
                            onChange={handleFileChange} 
                        />
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>
                            Recommended: Square JPG or PNG, at least 400x400.
                        </span>
                     </div>
                </div>

                <div className="form-section">
                    <h3>Personal Info</h3>
                    <div className="form-group">
                        <label className="form-label">Display Name</label>
                        <input className="input-field" value={user.username} disabled style={{ background: '#f8f9fa', cursor: 'not-allowed' }} />
                        <span style={{ fontSize: '0.8rem', color: '#888', marginTop: '5px', display: 'block' }}>Username cannot be changed once set.</span>
                    </div>

                    <div className="form-group" style={{ marginTop: '20px' }}>
                        <label className="form-label">Bio</label>
                        <textarea 
                            className="input-field" 
                            placeholder="Tell us a bit about yourself..."
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                        />
                    </div>
                </div>

                <div className="settings-footer">
                    <button className="button-primary" onClick={saveProfile}>Save Changes</button>
                </div>
            </div>
        )}

        {activeTab === "learning" && (
             <div className="animate-slide-up">
                <h2>Learning Journey</h2>
                <div className="form-section">
                    <h3>Languages</h3>
                    <div className="form-grid">
                        <LanguageInput 
                            label="I speak (Native)"
                            value={nativeLang}
                            onChange={setNativeLang}
                        />
                        <LanguageInput 
                            label="I want to learn (Target)"
                            value={targetLang}
                            onChange={setTargetLang}
                        />
                    </div>
                </div>

                <div className="form-section">
                    <h3>Goals</h3>
                    <div className="form-group">
                        <label className="form-label">Primary Goal</label>
                        <input 
                            className="input-field" 
                            placeholder="e.g. Travel, Business, Hobby..."
                            value={learningGoal}
                            onChange={(e) => setLearningGoal(e.target.value)}
                        />
                    </div>
                </div>

                <div className="settings-footer">
                    <button className="button-primary" onClick={saveProfile}>Update Learning Profile</button>
                </div>
             </div>
        )}

        {activeTab === "security" && (
            <div className="animate-slide-up">
                <h2>Password & Security</h2>
                
                <div className="form-section">
                    <h3>Change Password</h3>
                    <div className="form-group">
                        <label className="form-label">Current Password</label>
                        <input 
                            type="password"
                            className="input-field"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                        />
                    </div>
                    <div className="form-grid" style={{ marginTop: '15px' }}>
                        <div className="form-group">
                            <label className="form-label">New Password</label>
                            <input 
                                type="password"
                                className="input-field"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Confirm New Password</label>
                            <input 
                                type="password"
                                className="input-field"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-section">
                    <h3>Two-Factor Authentication</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', border: '1px solid #eee', borderRadius: '8px' }}>
                        <div className={`checkbox-custom ${twoFactorEnabled ? 'checked' : ''}`} onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}>
                            {twoFactorEnabled && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                        </div>
                        <div>
                            <div style={{ fontWeight: '500' }}>Enable 2FA</div>
                            <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>Add an extra layer of security to your account.</div>
                        </div>
                    </div>
                </div>

                <div className="settings-footer">
                    <button className="button-primary" onClick={saveSecurity}>Updating Security Settings</button>
                </div>
            </div>
        )}

        {message && (
            <div className="status-message success" style={{ marginTop: '20px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                {message}
            </div>
        )}
        {error && (
            <div className="status-message error" style={{ marginTop: '20px' }}>
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                {error}
            </div>
        )}

      </div>
      </div>
    </>
  );
}
