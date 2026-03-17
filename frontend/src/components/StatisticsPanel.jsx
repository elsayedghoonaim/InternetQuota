import React, { useMemo } from 'react';
import { RefreshCw, BarChart3, Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getMonthName, getTrend } from '../utils/helpers';

const StatisticsPanel = ({ statistics, accounts, loading, generating, onGenerate }) => {

    // Group statistics by account, sorted newest first
    const grouped = useMemo(() => {
        const map = {};
        statistics.forEach(stat => {
            const id = stat.account_identifier;
            if (!map[id]) map[id] = [];
            map[id].push(stat);
        });
        Object.values(map).forEach(months => {
            months.sort((a, b) => {
                if (a.year !== b.year) return b.year - a.year;
                return b.month - a.month;
            });
        });
        return map;
    }, [statistics]);

    if (loading && statistics.length === 0) {
        return (
            <div className="text-center py-20">
                <RefreshCw className="animate-spin h-10 w-10 text-blue-300 mx-auto mb-4" />
                <p className="text-gray-400">Loading statistics...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header + Generate Button */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                        <BarChart3 size={24} className="mr-2 text-blue-600" />
                        Usage Statistics
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Monthly usage history to help you decide your quota plan
                    </p>
                </div>
                <button
                    onClick={onGenerate}
                    disabled={generating}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow transition-all disabled:opacity-50"
                >
                    {generating ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
                    <span>{generating ? 'Generating...' : 'Generate Stats'}</span>
                </button>
            </div>

            {/* Empty State */}
            {statistics.length === 0 && !loading && (
                <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50">
                    <BarChart3 size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-400 mb-2 text-lg font-medium">Collecting data...</p>
                    <p className="text-gray-400 text-sm mb-4 max-w-sm mx-auto">
                        We need a minimum amount of data to calculate accurate statistics (at least a few days of activity). Your daily usage is being logged in the background, and statistics will automatically appear here once enough data is gathered.
                    </p>
                </div>
            )}

            {/* Monthly Tables per Account */}
            {Object.entries(grouped).map(([id, months]) => {
                const accountName = months[0]?.account_name || accounts.find(a => a.identifier === id)?.name || id;

                return (
                    <section key={id} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                        {/* Account Header */}
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                            <h3 className="font-bold text-gray-800">{accountName}</h3>
                            <p className="text-xs text-gray-400 font-mono mt-0.5">{id}</p>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="text-left px-6 py-3 text-gray-500 font-semibold">Month</th>
                                        <th className="text-right px-4 py-3 text-gray-500 font-semibold">Plan</th>
                                        <th className="text-right px-4 py-3 text-gray-500 font-semibold">Consumed</th>
                                        <th className="text-right px-4 py-3 text-gray-500 font-semibold">Avg / Day</th>
                                        <th className="text-right px-4 py-3 text-gray-500 font-semibold">Peak Day</th>
                                        <th className="text-right px-4 py-3 text-gray-500 font-semibold">Min Left</th>
                                        <th className="text-right px-4 py-3 text-gray-500 font-semibold">Usage %</th>
                                        <th className="text-center px-4 py-3 text-gray-500 font-semibold">Trend</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {months.map((stat, idx) => {
                                        const prev = months[idx + 1] || null;
                                        const trend = getTrend(stat.total_consumed_gb, prev ? prev.total_consumed_gb : null);

                                        const usagePct = stat.current_plan_gb > 0
                                            ? Math.min(100, (stat.total_consumed_gb / stat.current_plan_gb) * 100)
                                            : 0;

                                        let pctColor = 'text-blue-600';
                                        if (usagePct > 90) pctColor = 'text-red-600 font-bold';
                                        else if (usagePct > 75) pctColor = 'text-orange-500 font-semibold';
                                        else if (usagePct < 50) pctColor = 'text-emerald-600';

                                        return (
                                            <tr key={`${stat.year}-${stat.month}`} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-3 font-semibold text-gray-800">
                                                    <span>{getMonthName(stat.month)} {stat.year}</span>
                                                    {stat.total_days_in_month > 0 && stat.data_coverage_days / stat.total_days_in_month < 0.8 && (
                                                        <span
                                                            title={`Only ${stat.data_coverage_days} of ${stat.total_days_in_month} days have data — numbers may be understated`}
                                                            className="ml-2 text-xs bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium"
                                                        >
                                                            ⚠ {stat.data_coverage_days}/{stat.total_days_in_month} days
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right text-gray-500">
                                                    {stat.current_plan_gb} GB
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold text-gray-800">
                                                    {stat.total_consumed_gb} GB
                                                </td>
                                                <td className="px-4 py-3 text-right text-gray-600">
                                                    {stat.avg_daily_usage_gb} GB
                                                </td>
                                                <td className="px-4 py-3 text-right text-gray-600">
                                                    <span className="block">{stat.peak_usage_gb} GB</span>
                                                    {stat.peak_usage_date && (
                                                        <span className="text-xs text-gray-400">{stat.peak_usage_date}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right text-gray-600">
                                                    {stat.min_remaining_gb} GB
                                                </td>
                                                <td className={`px-4 py-3 text-right ${pctColor}`}>
                                                    {usagePct.toFixed(0)}%
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-flex items-center space-x-1 text-sm font-semibold ${trend.color}`} title={trend.label}>
                                                        {trend.arrow === '↑' && <TrendingUp size={16} />}
                                                        {trend.arrow === '↓' && <TrendingDown size={16} />}
                                                        {trend.arrow === '→' && <Minus size={16} />}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>

                                {/* Summary row (if more than 1 month) */}
                                {months.length > 1 && (() => {
                                    const avg = (months.reduce((s, m) => s + m.total_consumed_gb, 0) / months.length).toFixed(1);
                                    const peak = Math.max(...months.map(m => m.peak_usage_gb));
                                    const avgDaily = (months.reduce((s, m) => s + m.avg_daily_usage_gb, 0) / months.length).toFixed(1);
                                    return (
                                        <tfoot className="bg-blue-50 border-t-2 border-blue-100">
                                            <tr>
                                                <td className="px-6 py-3 font-bold text-blue-700 text-xs uppercase tracking-wide">
                                                    {months.length}-Month Average
                                                </td>
                                                <td className="px-4 py-3 text-right text-gray-400">—</td>
                                                <td className="px-4 py-3 text-right font-bold text-blue-700">{avg} GB</td>
                                                <td className="px-4 py-3 text-right font-bold text-blue-700">{avgDaily} GB</td>
                                                <td className="px-4 py-3 text-right font-bold text-blue-700">{peak} GB</td>
                                                <td className="px-4 py-3 text-right text-gray-400">—</td>
                                                <td className="px-4 py-3 text-right text-gray-400">—</td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    );
                                })()}
                            </table>
                        </div>
                    </section>
                );
            })}
        </div>
    );
};

export default StatisticsPanel;
