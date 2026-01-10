import { useState } from "react";
import axios from "axios";

export default function ProfileSettings({ user, onClose, onUpdate }) {
  const [nativeLang, setNativeLang] = useState(user?.profile?.native_language || "English");
  const [targetLang, setTargetLang] = useState(user?.profile?.target_language || "Spanish");
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSave = async () => {
    const formData = new FormData();
    formData.append("native_language", nativeLang);
    formData.append("target_language", targetLang);
    if (file) {
      formData.append("profile_picture", file);
    }

    try {
      await axios.patch("/api/auth/me/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Token ${localStorage.getItem("token")}`,
        },
      });
      setMessage("Profile updated!");
      setError("");
      onUpdate();
      setTimeout(onClose, 1000);
    } catch (err) {
      console.error(err);
      setError("Error updating profile.");
      setMessage("");
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-box">
        <h2>Profile Settings</h2>

        <div className="form-group">
          <label>Native Language</label>
          <input
            className="input-field"
            value={nativeLang}
            onChange={(e) => setNativeLang(e.target.value)}
            placeholder="e.g. English"
          />
        </div>

        <div className="form-group">
          <label>Target Language (to learn)</label>
          <input
            className="input-field"
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            placeholder="e.g. Spanish"
          />
        </div>

        <div className="form-group">
          <label>Profile Picture</label>
          <input
            type="file"
            className="input-field"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </div>

        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}

        <div className="auth-buttons">
          <button className="button-primary" onClick={handleSave}>
            Save
          </button>
          <button className="button-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
