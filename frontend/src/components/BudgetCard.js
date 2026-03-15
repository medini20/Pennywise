import { FaUtensils, FaCar, FaGamepad, FaHome, FaHeart } from "react-icons/fa";
import { FiEdit2 } from "react-icons/fi";
import { MdDelete } from "react-icons/md";

function BudgetCard({ name, spent, budget, color, icon }) {

  const remaining = budget - spent;
  const percent = (spent / budget) * 100;

  return (

    <div className="bg-[#0f1b3d] p-6 rounded-2xl mb-6 shadow-[0_0_20px_rgba(0,0,0,0.4)] flex justify-between items-center">

      {/* Left side */}
      <div className="flex items-center gap-5 w-full">

        {/* Icon circle */}
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
             style={{ background: "#1c2a55", color: color }}>
          {icon}
        </div>

        <div className="w-full">

          <h3 className="text-white text-lg font-semibold">
            {name}
          </h3>

          {/* Progress bar */}
          <div className="w-full h-2 bg-gray-700 rounded mt-2">

            <div
              className="h-2 rounded"
              style={{
                width: percent + "%",
                background: color
              }}
            />

          </div>

          <p className="text-gray-300 text-sm mt-2">

            Spent: ₹{spent}

            <span className="ml-4">
              Budget: ₹{budget}
            </span>

            <span className="ml-4 text-green-400 font-medium">
              Remaining: ₹{remaining}
            </span>

          </p>

        </div>

      </div>

      {/* Right icons */}
      <div className="flex gap-5 text-xl ml-6">

        <button className="text-gray-400 hover:text-white">
          <FiEdit2 />
        </button>

        <button className="text-red-500 hover:text-red-600">
          <MdDelete />
        </button>

      </div>

    </div>

  );
}

export default BudgetCard;