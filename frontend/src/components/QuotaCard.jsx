import React, { useState, useEffect } from 'react';
import { Wifi, Smartphone, Trash2, AlertTriangle, Clock } from 'lucide-react';
import ProgressBar from './ProgressBar';
import { getTimeAgo } from '../utils/helpers';

const QuotaCard = ({ account, onDelete }) => {
    const isLandline = account.type === 'LANDLINE';
    const remain = account.remain_gb || 0;
    const total = account.total_gb || 0;
    const used = account.used_gb || 0;
    const percentLeft = total > 0 ? (remain / total) * 100 : 0;
    const isLow = percentLeft <= 10 && total > 0;

    // Force re-render every minute to update relative time
    const [, setTick] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => {
            setTick(tick => tick + 1);
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className={`relative bg-white rounded-xl shadow-md border-l-4 p-5 hover:shadow-lg transition-shadow duration-300 ${isLow ? 'border-red-500' : 'border-blue-500'}`}>
            {isLow && (
                <div className="absolute top-2 right-2 text-red-500 flex items-center text-xs font-bold animate-pulse">
                    <AlertTriangle size={14} className="mr-1" /> LOW QUOTA
                </div>
            )}

            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-full ${isLandline ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                        {isLandline ? <Wifi size={24} /> : <Smartphone size={24} />}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg">{account.name || 'Unnamed Account'}</h3>
                        <p className="text-gray-500 text-sm font-mono tracking-wider">{account.identifier}</p>
                    </div>
                </div>
                <button
                    onClick={() => onDelete(account.identifier)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
                    title="Remove Account"
                >
                    <Trash2 size={18} />
                </button>
            </div>

            <div className="mb-2 flex justify-between text-sm text-gray-600 font-medium">
                <span>{remain.toFixed(1)} GB Remaining</span>
                <span>{total.toFixed(1)} GB Total</span>
            </div>

            <ProgressBar used={used} total={total} />

            <div className="mt-4 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-3">
                <div className="flex flex-col space-y-1">
                    <span className="font-medium text-gray-700">{account.offer_name || 'Unknown Offer'}</span>
                    <span className="text-gray-400">Exp: {account.expires_on ? account.expires_on.split(' ')[0] : 'N/A'}</span>
                </div>

                <div className="flex items-center bg-gray-50 px-2 py-1 rounded-md text-gray-400" title={`Last checked: ${account.last_check}`}>
                    <Clock size={12} className="mr-1.5" />
                    <span>{getTimeAgo(account.last_check)}</span>
                </div>
            </div>
        </div>
    );
};

export default QuotaCard;
