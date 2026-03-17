import React from 'react';
import { Trash2 } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
                <div className="p-6">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 text-red-600 mx-auto">
                        <Trash2 size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">{title}</h2>
                    <p className="text-gray-600 mb-6 text-center">{message}</p>
                    <div className="flex justify-center space-x-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="px-5 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium shadow-md transition-all flex items-center"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
