import React from 'react';

const TabButton = ({ id, activeTab, setActiveTab, icon, label, disabled = false }) => (
    <button
        onClick={() => !disabled && setActiveTab(id)}
        disabled={disabled}
        className={`${
            activeTab === id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500'
        } ${
            disabled 
                ? 'text-slate-400 cursor-not-allowed' 
                : 'hover:text-slate-700 hover:border-slate-300'
        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors duration-200 focus:outline-none`}
    >
        {React.cloneElement(icon, { className: 'h-5 w-5' })}
        <span>{label}</span>
    </button>
);

export default TabButton;
