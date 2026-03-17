import React from 'react';

const ProgressBar = ({ used, total }) => {
    if (!total || total === 0) return <div className="h-4 bg-gray-200 rounded-full w-full"></div>;

    const percentage = Math.max(0, Math.min(100, ((total - used) / total) * 100));

    let colorClass = "bg-green-500";
    if (percentage <= 10) colorClass = "bg-red-600 animate-pulse";
    else if (percentage <= 25) colorClass = "bg-orange-500";
    else if (percentage <= 50) colorClass = "bg-yellow-500";

    return (
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
            <div
                className={`${colorClass} h-4 transition-all duration-1000 ease-out`}
                style={{ width: `${percentage}%` }}
            ></div>
        </div>
    );
};

export default ProgressBar;
