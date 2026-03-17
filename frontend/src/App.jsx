import React, { useState, useEffect } from 'react';
import {
    Wifi, Smartphone, RefreshCw, AlertTriangle, X
} from 'lucide-react';

// Components
import Header from './components/Header';
import LoginScreen from './components/LoginScreen';
import QuotaCard from './components/QuotaCard';
import AddAccountModal from './components/AddAccountModal';
import ConfirmModal from './components/ConfirmModal';
import StatisticsPanel from './components/StatisticsPanel';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useAccounts } from './hooks/useAccounts';
import { useStatistics } from './hooks/useStatistics';

export default function App() {
    const { auth, login, logout } = useAuth();
    const {
        accounts, loading, refreshing, error, lastUpdated,
        setError, fetchQuotas, addAccount, deleteAccount
    } = useAccounts(auth, logout);

    const {
        statistics, loading: statsLoading, generating,
        fetchStatistics, generateStatistics
    } = useStatistics(auth);

    const [activeTab, setActiveTab] = useState('dashboard');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [pendingDelete, setPendingDelete] = useState(null);
    const deleteTimer = React.useRef(null);
    const [notificationPermission, setNotificationPermission] = useState("default");

    // Check initial notification permission
    useEffect(() => {
        if ("Notification" in window) {
            setNotificationPermission(Notification.permission);
        }
    }, []);

    // Helper for safe notifications on Android (which throws TypeError without a ServiceWorker)
    const safeNotification = (title, options) => {
        try {
            new Notification(title, options);
        } catch (err) {
            console.warn("Desktop notifications not fully supported on this device/browser.", err);
        }
    };

    const requestNotificationPermission = async () => {
        if (!("Notification" in window)) {
            alert("This browser does not support desktop notifications");
            return;
        }
        try {
            // Safari older versions don't return promises
            let permission = Notification.permission;
            if (permission !== 'granted') {
                permission = await new Promise(resolve => {
                    const result = Notification.requestPermission(resolve);
                    if (result) {
                        result.then(resolve);
                    }
                });
            }

            setNotificationPermission(permission);
            if (permission === 'granted') {
                safeNotification("Notifications Enabled!", {
                    body: "You will now receive alerts for low quota.",
                    icon: "https://cdn-icons-png.flaticon.com/512/564/564619.png"
                });
            }
        } catch (e) {
            console.error("Failed to request notification permission:", e);
            alert("Notification permission failed. This might not be supported on your device or requires secure HTTPS.");
        }
    };

    // Fetch statistics when tab switches to statistics
    useEffect(() => {
        if (auth && activeTab === 'statistics') {
            fetchStatistics();
        }
    }, [auth, activeTab]);

    // Low quota browser notifications
    useEffect(() => {
        if (!("Notification" in window) || notificationPermission !== "granted") return;
        if (loading || accounts.length === 0) return;

        accounts.forEach(acc => {
            const remain = acc.remain_gb || 0;
            const total = acc.total_gb || 0;

            if (total > 0) {
                const percent = (remain / total) * 100;
                if (percent <= 10) {
                    const tag = `low-quota-${acc.identifier}-${new Date().getHours()}`;
                    safeNotification(`⚠️ Low Quota: ${acc.name || acc.identifier}`, {
                        body: `${remain.toFixed(1)} GB remaining (${percent.toFixed(1)}%)`,
                        tag: tag,
                        icon: "https://cdn-icons-png.flaticon.com/512/564/564619.png"
                    });
                }
            }
        });
    }, [accounts, loading, notificationPermission]);

    // --- Handlers ---
    const handleAddAccount = async (formData) => {
        const ok = await addAccount(formData);
        if (ok) setIsModalOpen(false);
    };

    const promptDelete = (identifier) => {
        setError(null);
        setDeleteTarget(identifier);
    };

    const executeDelete = async () => {
        if (!deleteTarget) return;
        const identifier = deleteTarget;
        setDeleteTarget(null);

        // Optimistic UI deletion
        setPendingDelete(identifier);

        // Start 5 second countdown before real deletion
        if (deleteTimer.current) clearTimeout(deleteTimer.current);
        deleteTimer.current = setTimeout(async () => {
            await deleteAccount(identifier);
            setPendingDelete(null);
        }, 5000);
    };

    const handleUndoDelete = () => {
        if (deleteTimer.current) clearTimeout(deleteTimer.current);
        setPendingDelete(null);
    };

    const handleRefresh = () => {
        if (activeTab === 'dashboard') {
            fetchQuotas(true);
        } else {
            fetchStatistics();
        }
    };

    // --- Render ---
    if (!auth) return <LoginScreen onLogin={login} loading={loading} />;

    // Filter out the pending deletion from UI
    const visibleAccounts = accounts.filter(a => a.identifier !== pendingDelete);

    // Group Accounts
    const landlines = visibleAccounts.filter(a => a.type === 'LANDLINE');
    const weAir = visibleAccounts.filter(a => ['WE_AIR', 'MOBILE'].includes(a.type));

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-12">
            <Header
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onRefresh={handleRefresh}
                refreshing={refreshing}
                onAdd={() => setIsModalOpen(true)}
                onLogout={logout}
                notificationPermission={notificationPermission}
                onRequestNotification={requestNotificationPermission}
                lastUpdated={lastUpdated}
            />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

                {/* Error Banner */}
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-center animate-in slide-in-from-top-4">
                        <AlertTriangle className="text-red-500 mr-3" />
                        <p className="text-red-700 font-medium">{error}</p>
                        <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600"><X size={18} /></button>
                    </div>
                )}

                {/* === DASHBOARD TAB === */}
                {activeTab === 'dashboard' && (
                    <>
                        {/* Loading State */}
                        {loading && !refreshing && accounts.length === 0 && (
                            <div className="text-center py-20">
                                <RefreshCw className="animate-spin h-10 w-10 text-blue-300 mx-auto mb-4" />
                                <p className="text-gray-400">Syncing with satellites...</p>
                            </div>
                        )}

                        {/* Empty State */}
                        {!loading && accounts.length === 0 && !error && (
                            <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-3xl">
                                <p className="text-gray-400 mb-4">No internet connections tracked yet.</p>
                                <button onClick={() => setIsModalOpen(true)} className="text-blue-600 font-bold hover:underline">Add your first account</button>
                            </div>
                        )}

                        {/* Landlines Section */}
                        {landlines.length > 0 && (
                            <section>
                                <div className="flex items-center space-x-2 mb-6">
                                    <h2 className="text-2xl font-bold text-gray-800">Landlines</h2>
                                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">{landlines.length}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {landlines.map(acc => (
                                        <QuotaCard key={acc.identifier} account={acc} onDelete={promptDelete} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* WE Air Section */}
                        {weAir.length > 0 && (
                            <section>
                                <div className="flex items-center space-x-2 mb-6">
                                    <h2 className="text-2xl font-bold text-gray-800">WE Air (4G)</h2>
                                    <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-full">{weAir.length}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {weAir.map(acc => (
                                        <QuotaCard key={acc.identifier} account={acc} onDelete={promptDelete} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}

                {/* === STATISTICS TAB === */}
                {activeTab === 'statistics' && (
                    <StatisticsPanel
                        statistics={statistics}
                        accounts={accounts}
                        loading={statsLoading}
                        generating={generating}
                        onGenerate={generateStatistics}
                    />
                )}
            </main>

            <AddAccountModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAdd={handleAddAccount}
                loading={loading}
            />

            <ConfirmModal
                isOpen={!!deleteTarget}
                title="Remove Connection?"
                message={`Are you sure you want to delete ${deleteTarget}?`}
                onClose={() => setDeleteTarget(null)}
                onConfirm={executeDelete}
            />

            {/* Undo Toast */}
            {pendingDelete && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center space-x-4 animate-in slide-in-from-bottom-10 z-50">
                    <span>Account removed.</span>
                    <button
                        onClick={handleUndoDelete}
                        className="text-blue-400 font-bold hover:text-blue-300 transition-colors uppercase text-sm tracking-wider"
                    >
                        Undo
                    </button>
                </div>
            )}
        </div>
    );
}
