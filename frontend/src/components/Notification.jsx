import React from 'react';
import { CheckCircle2, AlertCircle } from './Icons';

const Notification = ({ type, message }) => {
    const baseClasses = "fixed top-5 right-5 flex items-center p-4 rounded-lg shadow-lg text-white z-50";
    const typeClasses = {
        success: "bg-green-500",
        error: "bg-red-500",
        info: "bg-blue-500",
    };
    const Icon = {
        success: <CheckCircle2 className="h-5 w-5 mr-3"/>,
        error: <AlertCircle className="h-5 w-5 mr-3"/>,
        info: <AlertCircle className="h-5 w-5 mr-3"/>,
    }[type];

    return (
        <div className={`${baseClasses} ${typeClasses[type]}`}>
            {Icon}
            {message}
        </div>
    );
};

export default Notification;
