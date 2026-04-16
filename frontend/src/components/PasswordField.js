import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

function PasswordField({ style, containerStyle, iconColor = "#111111", ...props }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        ...containerStyle,
      }}
    >
      <input
        {...props}
        type={isVisible ? "text" : "password"}
        style={{
          width: "100%",
          boxSizing: "border-box",
          ...style,
          paddingRight: "48px",
        }}
      />
      <button
        type="button"
        onClick={() => setIsVisible((current) => !current)}
        aria-label={isVisible ? "Hide password" : "Show password"}
        aria-pressed={isVisible}
        style={{
          position: "absolute",
          top: "50%",
          right: "14px",
          transform: "translateY(-50%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          border: "none",
          background: "transparent",
          color: iconColor,
          cursor: "pointer",
          zIndex: 1,
        }}
      >
        {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export default PasswordField;
