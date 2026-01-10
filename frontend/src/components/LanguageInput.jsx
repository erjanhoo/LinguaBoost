import { useState, useRef, useEffect } from "react";

const LANGUAGES = [
  "English", "Spanish", "French", "German", "Italian", "Portuguese", 
  "Russian", "Chinese", "Japanese", "Korean", "Arabic", "Turkish", 
  "Dutch", "Swedish", "Polish", "Ukrainian", "Romanian", "Greek", 
  "Czech", "Hungarian", "Danish", "Finnish", "Norwegian", "Hindi"
];

export default function LanguageInput({ label, value, onChange, placeholder }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    onChange(val);
    
    if (val.trim()) {
      const filtered = LANGUAGES.filter(lang => 
        lang.toLowerCase().includes(val.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelect = (lang) => {
    onChange(lang);
    setShowSuggestions(false);
  };

  return (
    <div className="form-group" ref={wrapperRef}>
        <label className="form-label">{label}</label>
        <div className="input-wrapper">
            <input
                className="input-field"
                value={value}
                onChange={handleInputChange}
                onFocus={() => {
                  if (value.trim()) {
                    const filtered = LANGUAGES.filter(lang => 
                      lang.toLowerCase().includes(value.toLowerCase())
                    );
                    setSuggestions(filtered);
                    setShowSuggestions(true);
                  }
                }}
                placeholder={placeholder}
            />
            {showSuggestions && suggestions.length > 0 && (
                <ul className="suggestions-list">
                    {suggestions.map((lang) => (
                        <li 
                            key={lang} 
                            className="suggestion-item"
                            onClick={() => handleSelect(lang)}
                        >
                            {lang}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    </div>
  );
}
