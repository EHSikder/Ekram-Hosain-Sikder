import React from 'react';
import { LogEntry, Order } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { FileText, Activity, DollarSign, Calendar } from 'lucide-react';

interface DashboardProps {
  logs: LogEntry[];
  orders: Order[];
}

const Dashboard: React.FC<DashboardProps> = ({ logs, orders }) => {
  // Mock data for chart
  const chartData = [
    { name: 'Mon', orders: 12 },
    { name: 'Tue', orders: 19 },
    { name: 'Wed', orders: 15 },
    { name: 'Thu', orders: 22 },
    { name: 'Fri', orders: 30 },
    { name: 'Sat', orders: 25 },
    { name: 'Sun', orders: 10 },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-full overflow-y-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Manager Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg mr-4">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Interactions</p>
            <p className="text-2xl font-bold">{logs.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="p-3 bg-green-100 text-green-600 rounded-lg mr-4">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Active Orders</p>
            <p className="text-2xl font-bold">{orders.filter(o => o.status !== 'Delivered').length}</p>
          </div>
        </div>
         <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg mr-4">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Revenue (Day)</p>
            <p className="text-2xl font-bold">145 KD</p>
          </div>
        </div>
         <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-lg mr-4">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Pending Pickups</p>
            <p className="text-2xl font-bold">8</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Logs Table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
             <h2 className="font-semibold text-lg">Communication Logs (Google Sheet Mock)</h2>
             <span className="text-xs bg-gray-100 px-2 py-1 rounded">Live Sync</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">Channel</th>
                  <th className="p-3">Intent</th>
                  <th className="p-3">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.slice().reverse().map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition">
                    <td className="p-3 text-gray-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${log.channel === 'WhatsApp' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                            {log.channel}
                        </span>
                    </td>
                    <td className="p-3 font-medium">{log.intent}</td>
                    <td className="p-3 text-gray-600 truncate max-w-xs">{log.summary}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                    <tr><td colSpan={4} className="p-4 text-center text-gray-400">No logs yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chart Column */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
           <h2 className="font-semibold text-lg mb-4">Weekly Order Volume</h2>
           <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                  <Tooltip 
                    cursor={{fill: '#f0f2f5'}} 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} 
                  />
                  <Bar dataKey="orders" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
           </div>

           <div className="mt-6">
                <h3 className="font-semibold text-md mb-3">Recent CleanCloud Orders</h3>
                <div className="space-y-3">
                    {orders.slice(0, 3).map(order => (
                        <div key={order.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                                <p className="font-medium text-sm">{order.id}</p>
                                <p className="text-xs text-gray-500">{order.customerName}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded border ${
                                order.status === 'Delivered' ? 'bg-green-50 border-green-200 text-green-700' : 
                                order.status === 'Washing' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-orange-50 border-orange-200 text-orange-700'
                            }`}>
                                {order.status}
                            </span>
                        </div>
                    ))}
                </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
