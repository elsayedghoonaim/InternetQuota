import React, { useState, useEffect } from 'react';
import {
    Server, RefreshCw, Plus, LogOut, Bell,
    BarChart3, LayoutDashboard
} from 'lucide-react';

/** 
 * Strict frontend stopwatch. Reflects exact milliseconds elapsed since 
 * the 'lastUpdated' numeric timestamp was set in useAccounts.js.
 */
function useStrictTimeSince(lastUpdated) {
    const [label, setLabel] = useState('');
    const [stale, setStale] = useState(false);

    useEffect(() => {
        if (!lastUpdated) {
            setLabel('');
            return;
        }

        const update = () => {
            const secs = Math.max(0, Math.floor((Date.now() - lastUpdated) / 1000));
            const m = Math.floor(secs / 60);
            const s = secs % 60;

            if (secs < 60) setLabel('Just now');
            else setLabel(`${m}m ${s}s ago`);

            setStale(secs >= 4 * 60); // yellow warning at 4 min
        };

        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [lastUpdated]);

    return { label, stale };
}

const Header = ({
    activeTab, onTabChange,
    onRefresh, refreshing,
    onAdd, onLogout,
    notificationPermission, onRequestNotification,
    lastUpdated
}) => {
    const { label: updatedLabel, stale } = useStrictTimeSince(lastUpdated);

    return (
        <>
            <header className="bg-white shadow-sm sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-blue-700">
                        <Server size={24} />
                        <h1 className="text-xl font-bold tracking-tight">NetQuota<span className="text-gray-400 font-light">Manager</span></h1>
                    </div>

                    {/* Tab Navigation */}
                    <nav className="hidden sm:flex items-center bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => onTabChange('dashboard')}
                            className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'dashboard'
                                ? 'bg-white shadow-sm text-blue-700'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <LayoutDashboard size={16} />
                            <span>Dashboard</span>
                        </button>
                        <button
                            onClick={() => onTabChange('statistics')}
                            className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'statistics'
                                ? 'bg-white shadow-sm text-blue-700'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <BarChart3 size={16} />
                            <span>Statistics</span>
                        </button>
                    </nav>

                    <div className="flex items-center space-x-3">

                        {/* Last Updated Badge */}
                        {updatedLabel && (
                            <div
                                className={`hidden sm:flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${stale
                                    ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                                    : 'bg-green-50 border-green-200 text-green-700'
                                    }`}
                                title="Time since last data refresh"
                            >
                                <span
                                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${stale ? 'bg-yellow-400' : 'bg-green-400'}`}
                                />
                                <span>{updatedLabel}</span>
                            </div>
                        )}

                        <button
                            onClick={onRefresh}
                            disabled={refreshing}
                            className={`p-2 rounded-full text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-all ${refreshing ? 'animate-spin text-blue-600' : ''}`}
                            title="Refresh Quotas"
                        >
                            <RefreshCw size={20} />
                        </button>
                        {activeTab === 'dashboard' && (
                            <button
                                onClick={onAdd}
                                className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow transition-all"
                            >
                                <Plus size={16} /> <span>Add</span>
                            </button>
                        )}
                        <div className="h-6 w-px bg-gray-200 mx-2"></div>
                        <button onClick={onLogout} className="text-gray-400 hover:text-red-500">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>

                {/* Mobile Tab Bar */}
                <div className="sm:hidden border-t border-gray-100 flex">
                    <button
                        onClick={() => onTabChange('dashboard')}
                        className={`flex-1 flex items-center justify-center space-x-1.5 py-3 text-sm font-medium transition-all ${activeTab === 'dashboard'
                            ? 'text-blue-700 border-b-2 border-blue-600'
                            : 'text-gray-500'
                            }`}
                    >
                        <LayoutDashboard size={16} />
                        <span>Dashboard</span>
                    </button>
                    <button
                        onClick={() => onTabChange('statistics')}
                        className={`flex-1 flex items-center justify-center space-x-1.5 py-3 text-sm font-medium transition-all ${activeTab === 'statistics'
                            ? 'text-blue-700 border-b-2 border-blue-600'
                            : 'text-gray-500'
                            }`}
                    >
                        <BarChart3 size={16} />
                        <span>Statistics</span>
                    </button>
                </div>
            </header>

            {/* Notification Banner */}
            {notificationPermission === 'default' && (
                <div className="bg-blue-50 border-b border-blue-100">
                    <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center text-blue-700 text-sm">
                            <Bell size={18} className="mr-2" />
                            <span>Enable desktop notifications to get alerts when your quota is low.</span>
                        </div>
                        <button
                            onClick={onRequestNotification}
                            className="text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Enable Alerts
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default Header;
