import React, { useState, useEffect } from 'react';
import { Wifi, Smartphone, RefreshCw, Plus, X } from 'lucide-react';

const AddAccountModal = ({ isOpen, onClose, onAdd, loading }) => {
    const [formData, setFormData] = useState({
        type: 'LANDLINE',
        identifier: '',
        password: '',
        name: ''
    });

    useEffect(() => {
        if (!isOpen) {
            setFormData({
                type: 'LANDLINE',
                identifier: '',
                password: '',
                name: ''
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        onAdd(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800">Add New Connection</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Connection Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, type: 'LANDLINE' })}
                                className={`py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${formData.type === 'LANDLINE' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                            >
                                <Wifi size={16} className="inline mr-2" /> Landline
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, type: 'WE_AIR' })}
                                className={`py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${formData.type === 'WE_AIR' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                            >
                                <Smartphone size={16} className="inline mr-2" /> WE Air
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {formData.type === 'LANDLINE' ? 'Landline Number (e.g. 022...)' : 'Service Number (e.g. 015...)'}
                        </label>
                        <input
                            required
                            type="text"
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="0200000000"
                            value={formData.identifier}
                            onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Account Password (My WE)
                        </label>
                        <input
                            required
                            type="text"
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="Secret123"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="Home, Office, etc."
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                        >
                            {loading ? <RefreshCw className="animate-spin mr-2" /> : <Plus className="mr-2" />}
                            Add Account
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddAccountModal;
