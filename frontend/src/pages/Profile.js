import React from "react";

function Profile() {
  return (

    <div className="flex bg-[#0b1230] min-h-screen text-white">

      {/* Sidebar */}
      <div className="w-60 bg-[#0f1a3a] p-6">

        <h2 className="text-xl font-bold mb-10">PENNYWISE</h2>

        <ul className="space-y-4">

          <li>Records</li>
          <li>Charts</li>
          <li>Budget</li>
          <li>Alerts</li>

          <li className="bg-blue-600 p-2 rounded">
            Profile
          </li>

        </ul>

      </div>

      {/* Main profile section */}
      <div className="flex-1 flex flex-col items-center pt-20">

        {/* Avatar */}
        <div className="w-40 h-40 bg-gray-400 rounded-full mb-6"></div>

        <button className="border border-blue-500 px-4 py-2 rounded mb-10">
          Change Profile
        </button>

        {/* Username */}
        <div className="bg-[#111c44] w-96 p-6 rounded-lg flex justify-between items-center mb-6">

          <div>
            <p className="text-gray-400">Username</p>
            <p className="text-lg">alex_user_92</p>
          </div>

          <button className="bg-blue-500 px-4 py-2 rounded">
            Edit
          </button>

        </div>

        {/* Email */}
        <div className="bg-[#111c44] w-96 p-6 rounded-lg flex justify-between items-center mb-10">

          <div>
            <p className="text-gray-400">Email</p>
            <p className="text-lg">alex.user92@gmail.com</p>
          </div>

          <button className="bg-blue-500 px-4 py-2 rounded">
            Edit
          </button>

        </div>

        <button className="border border-red-500 px-6 py-2 rounded text-red-500">
          Log Out
        </button>

      </div>

    </div>

  );
}

export default Profile;