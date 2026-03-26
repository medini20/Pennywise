import React from "react";
import { MdWarning } from "react-icons/md";
import "./Notifications.css";

export default function Notifications({ notifications, removeNotification }) {

  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="notifications">

      {notifications.map((n) => (

        <div key={n.id} className="notification">

          <span className="notificationIcon">
            {n.icon || <MdWarning />}
          </span>

          <span className="notificationText">
            {n.message}
          </span>

          <button
            className="closeBtn"
            onClick={() => removeNotification(n.id)}
          >
            ✕
          </button>

        </div>

      ))}

    </div>
  );
}
