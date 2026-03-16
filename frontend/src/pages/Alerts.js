import React, { useState, useMemo } from 'react';
import { Bell, Plus, Edit2, Trash2, X, AlertTriangle, CheckCircle } from 'lucide-react';

/**
 * We define the function normally, then export it as 'default' at the bottom.
 * This allows App.js to import it as 'import Alerts from ...'
 */
function AlertsView() {
  const [budget, setBudget] = useState(5000);
  const [currentSpending, setCurrentSpending] = useState(3000);
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [showAddAlertDialog, setShowAddAlertDialog] = useState(false);
  const [editBudgetValue, setEditBudgetValue] = useState('');
  const [newAlertPercentage, setNewAlertPercentage] = useState('');
  
  const [alerts, setAlerts] = useState([
    { id: '1', percentage: 50 },
    { id: '2', percentage: 75 },
    { id: '3', percentage: 90 },
  ]);

  // Derived values: Calculated on every render
  const spentPercentage = useMemo(() => (currentSpending / budget) * 100, [currentSpending, budget]);

  const getAlertStatus = (percentage) => spentPercentage >= percentage;

  const getAlertColor = (percentage) => {
    if (percentage <= 50) return '#22C55E';
    if (percentage <= 75) return '#FACC15';
    return '#EF4444';
  };

  const handleAddAlert = () => {
    const percentage = parseInt(newAlertPercentage);
    if (!isNaN(percentage) && percentage > 0 && percentage <= 100) {
      const newAlert = {
        id: Date.now().toString(),
        percentage,
      };
      setAlerts([...alerts, newAlert].sort((a, b) => a.percentage - b.percentage));
      setNewAlertPercentage('');
      setShowAddAlertDialog(false);
    }
  };

  const handleDeleteAlert = (id) => {
    setAlerts(alerts.filter(alert => alert.id !== id));
  };

  const handleUpdateBudget = () => {
    const val = parseInt(editBudgetValue);
    if (!isNaN(val) && val > 0) {
      setBudget(val);
      setEditBudgetValue('');
      setShowBudgetDialog(false);
    }
  };

  return (
    <div className="w-full p-4" style={{ color: 'white' }}>
      {/* Budget Summary Section */}
      <div className="rounded-xl p-6 mb-6" style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-sm text-gray-400">Monthly Budget</p>
            <h2 className="text-3xl font-bold">₹{budget.toLocaleString()}</h2>
          </div>
          <button 
            onClick={() => { setEditBudgetValue(budget.toString()); setShowBudgetDialog(true); }}
            className="p-2 bg-blue-500/20 rounded-lg text-blue-400 hover:bg-blue-500/30 transition-all"
          >
            <Edit2 size={20} />
          </button>
        </div>
        
        <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full transition-all duration-500" 
            style={{ 
              width: `${Math.min(spentPercentage, 100)}%`, 
              background: getAlertColor(spentPercentage) 
            }} 
          />
        </div>
        <p className="mt-2 text-sm text-gray-400">Current Progress: {spentPercentage.toFixed(1)}%</p>
      </div>

      {/* Thresholds List */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-white">Alert Thresholds</h3>
        <button 
          onClick={() => setShowAddAlertDialog(true)}
          className="flex items-center gap-2 bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold hover:bg-yellow-400 transition-colors"
        >
          <Plus size={18} /> Add Alert
        </button>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => {
          const isTriggered = getAlertStatus(alert.percentage);
          const color = getAlertColor(alert.percentage);
          return (
            <div 
              key={alert.id} 
              className="flex items-center justify-between p-4 rounded-xl transition-all"
              style={{ 
                background: 'rgba(255,255,255,0.03)', 
                border: `1px solid ${isTriggered ? color : 'rgba(255,255,255,0.1)'}` 
              }}
            >
              <div className="flex items-center gap-4">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center" 
                  style={{ background: `${color}20` }}
                >
                  {isTriggered ? <AlertTriangle size={20} color={color} /> : <CheckCircle size={20} color={color} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-white">{alert.percentage}% Alert</p>
                    {isTriggered && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest" style={{ background: color, color: '#000' }}>
                        Triggered
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">Triggers at ₹{((budget * alert.percentage) / 100).toLocaleString()}</p>
                </div>
              </div>
              <button 
                onClick={() => handleDeleteAlert(alert.id)} 
                className="text-gray-500 hover:text-red-400 p-2 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Edit Budget Modal */}
      {showBudgetDialog && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-slate-900 p-8 rounded-2xl border border-white/10 w-full max-w-md text-white shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">Modify Monthly Budget</h2>
            <input 
              type="number" 
              className="w-full p-4 bg-white/5 rounded-xl mb-6 outline-none border border-white/10 focus:border-blue-500 transition-all text-lg"
              value={editBudgetValue}
              onChange={(e) => setEditBudgetValue(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setShowBudgetDialog(false)} className="flex-1 py-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all font-semibold">Cancel</button>
              <button onClick={handleUpdateBudget} className="flex-1 py-3 bg-blue-600 rounded-xl hover:bg-blue-500 transition-all font-semibold">Update</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Alert Modal */}
      {showAddAlertDialog && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-slate-900 p-8 rounded-2xl border border-white/10 w-full max-w-md text-white shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">New Alert Percentage</h2>
            <input 
              type="number" 
              placeholder="e.g. 85"
              className="w-full p-4 bg-white/5 rounded-xl mb-6 outline-none border border-white/10 focus:border-yellow-500 transition-all text-lg"
              value={newAlertPercentage}
              onChange={(e) => setNewAlertPercentage(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setShowAddAlertDialog(false)} className="flex-1 py-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all font-semibold">Cancel</button>
              <button onClick={handleAddAlert} className="flex-1 py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-all">Add Alert</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * EXPORT DEFAULT:
 * This line is the magic fix. It tells React that when someone imports 
 * this file, 'AlertsView' is the component they get by default.
 */
export default AlertsView;