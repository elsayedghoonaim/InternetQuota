import React, { useMemo, useState } from 'react';
import { RefreshCw, BarChart3, Zap, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import {
    ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, RadialBarChart, RadialBar, Cell
} from 'recharts';
import { getMonthName, getTrend } from '../utils/helpers';

const COLORS = {
    consumed: '#3b82f6',
    plan: '#e2e8f0',
    avgDaily: '#f59e0b',
    minLeft: '#10b981',
};

const UsageTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
            <p className="font-bold text-gray-700 mb-2">{label}</p>
            {payload.map(p => (
                <div key={p.dataKey} className="flex items-center justify-between space-x-4">
                    <span className="flex items-center space-x-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                        <span className="text-gray-500">{p.name}</span>
                    </span>
                    <span className="font-semibold text-gray-800">{p.value} GB</span>
                </div>
            ))}
        </div>
    );
};

const UsageGauge = ({ usagePct }) => {
    const clamped = Math.min(100, Math.max(0, usagePct));
    const color = clamped > 90 ? '#ef4444' : clamped > 75 ? '#f97316' : clamped < 50 ? '#10b981' : '#3b82f6';
    const data = [{ name: 'usage', value: clamped, fill: color }];
    return (
        <div className="flex flex-col items-center">
            <div className="relative w-28 h-28">
                <RadialBarChart
                    width={112} height={112}
                    innerRadius={36} outerRadius={52}
                    startAngle={210} endAngle={-30}
                    data={[{ value: 100, fill: '#f1f5f9' }, { value: clamped, fill: color }]}
                    barSize={12}
                >
                    <RadialBar background dataKey="value" />
                </RadialBarChart>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-extrabold" style={{ color }}>{clamped.toFixed(0)}%</span>
                    <span className="text-xs text-gray-400">used</span>
                </div>
            </div>
        </div>
    );
};

const AccountChart = ({ months, accountName, id }) => {
    const [showTable, setShowTable] = useState(true);

    const chartData = useMemo(() => {
        return [...months].reverse().map(stat => ({
            label: `${getMonthName(stat.month)} ${stat.year}`,
            Consumed: stat.total_consumed_gb,
            Plan: stat.current_plan_gb,
            'Avg/Day': stat.avg_daily_usage_gb,
            'Min Left': stat.min_remaining_gb,
        }));
    }, [months]);

    const latestStat = months[0];
    const avgPct = latestStat && latestStat.current_plan_gb > 0
        ? (latestStat.total_consumed_gb / latestStat.current_plan_gb) * 100
        : 0;

    const overallAvg = (months.reduce((s, m) => s + m.total_consumed_gb, 0) / months.length).toFixed(1);
    const peakMonth = months.reduce((best, m) => m.total_consumed_gb > best.total_consumed_gb ? m : best, months[0]);

    return (
        <section className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
            {/* Account Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-gray-800 text-base">{accountName}</h3>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{id}</p>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span className="bg-white border border-gray-200 rounded-full px-2 py-0.5">
                        {months.length} month{months.length !== 1 ? 's' : ''} of data
                    </span>
                </div>
            </div>

            {/* Summary KPI strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100 border-b border-gray-100">
                <div className="px-5 py-4 flex flex-col items-center">
                    <UsageGauge usagePct={avgPct} />
                    <p className="text-xs text-gray-400 mt-1">Latest Month</p>
                </div>
                <div className="px-5 py-4 flex flex-col justify-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Avg Consumption</p>
                    <p className="text-2xl font-extrabold text-gray-800">{overallAvg} <span className="text-sm font-normal text-gray-400">GB/mo</span></p>
                </div>
                <div className="px-5 py-4 flex flex-col justify-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Peak Month</p>
                    <p className="text-2xl font-extrabold text-gray-800">{peakMonth?.total_consumed_gb} <span className="text-sm font-normal text-gray-400">GB</span></p>
                    <p className="text-xs text-gray-400 mt-0.5">{getMonthName(peakMonth?.month)} {peakMonth?.year}</p>
                </div>
                <div className="px-5 py-4 flex flex-col justify-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Plan Size</p>
                    <p className="text-2xl font-extrabold text-gray-800">{latestStat?.current_plan_gb} <span className="text-sm font-normal text-gray-400">GB</span></p>
                </div>
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
                <div className="px-4 pt-5 pb-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 px-2">Monthly Breakdown</p>
                    <ResponsiveContainer width="100%" height={220}>
                        <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis unit=" GB" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={56} />
                            <Tooltip content={<UsageTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="Plan" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Plan" />
                            <Bar dataKey="Consumed" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Consumed">
                                {chartData.map((entry, i) => {
                                    const pct = entry.Plan > 0 ? (entry.Consumed / entry.Plan) * 100 : 0;
                                    const fill = pct > 90 ? '#ef4444' : pct > 75 ? '#f97316' : '#3b82f6';
                                    return <Cell key={i} fill={fill} />;
                                })}
                            </Bar>
                            <Line type="monotone" dataKey="Avg/Day" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} name="Avg/Day" />
                            <Line type="monotone" dataKey="Min Left" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} strokeDasharray="4 2" name="Min Left" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Toggle table */}
            <div className="px-6 py-3 border-t border-gray-100">
                <button
                    onClick={() => setShowTable(v => !v)}
                    className="flex items-center space-x-1 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                >
                    {showTable ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    <span>{showTable ? 'Hide' : 'Show'} detailed table</span>
                </button>
            </div>

            {/* Table */}
            {showTable && (
                <div className="overflow-x-auto border-t border-gray-100">
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
                                                    title={`Only ${stat.data_coverage_days} of ${stat.total_days_in_month} days have data`}
                                                    className="ml-2 text-xs bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium"
                                                >
                                                    ⚠ {stat.data_coverage_days}/{stat.total_days_in_month} days
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-500">{stat.current_plan_gb} GB</td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-800">{stat.total_consumed_gb} GB</td>
                                        <td className="px-4 py-3 text-right text-gray-600">{stat.avg_daily_usage_gb} GB</td>
                                        <td className="px-4 py-3 text-right text-gray-600">
                                            <span className="block">{stat.peak_usage_gb} GB</span>
                                            {stat.peak_usage_date && (
                                                <span className="text-xs text-gray-400">{stat.peak_usage_date}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-600">{stat.min_remaining_gb} GB</td>
                                        <td className={`px-4 py-3 text-right ${pctColor}`}>{usagePct.toFixed(0)}%</td>
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
            )}
        </section>
    );
};

const StatisticsPanel = ({ statistics, accounts, loading, generating, onGenerate }) => {
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
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                        <BarChart3 size={24} className="mr-2 text-blue-600" />
                        Usage Statistics
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Monthly usage history to help you decide your quota plan</p>
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
                        We need a minimum amount of data to calculate accurate statistics (at least a few days of activity).
                        Your daily usage is being logged in the background, and statistics will automatically appear here once enough data is gathered.
                    </p>
                </div>
            )}

            {/* Per-Account Charts + Tables */}
            {Object.entries(grouped).map(([id, months]) => {
                const accountName = months[0]?.account_name || accounts.find(a => a.identifier === id)?.name || id;
                return (
                    <AccountChart key={id} months={months} accountName={accountName} id={id} />
                );
            })}
        </div>
    );
};

export default StatisticsPanel;
