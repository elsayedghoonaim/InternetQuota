import React, { useState } from 'react';
import { Signal, RefreshCw } from 'lucide-react';

const LoginScreen = ({ onLogin, loading }) => {
    const [creds, setCreds] = useState({ username: 'admin', password: '' });

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
                <div className="text-center mb-8">
                    <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                        <Signal size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">Internet Quota Manager</h1>
                    <p className="text-gray-500 mt-2">Sign in to manage your connections</p>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); onLogin(creds); }} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <input
                            type="text"
                            value={creds.username}
                            onChange={(e) => setCreds({ ...creds, username: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            value={creds.password}
                            onChange={(e) => setCreds({ ...creds, password: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow mt-4 transition-all flex justify-center"
                    >
                        {loading ? <RefreshCw className="animate-spin" /> : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginScreen;
