'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building2, Users, MapPin, Network, Search, 
  ArrowUpRight, ArrowDownRight, Filter,
  Activity, TrendingUp
} from 'lucide-react';
import PrivateRoute from '../protectedRoute'
import Image from 'next/image'
import _ from 'lodash';

// Interfaces
interface MarketingEmployee {
  ecno: string;
  name: string;
  designation: string;
  referenceCode: string;
  location: string;
  customer_location: string;
  concern: string;
  division: string;
  branch: string;
  ip: string;
  timestamp: string;
}

interface DailyActivityData {
  date: string;
  uniqueReferenceCodes: number;
  ecno: string;
  name: string;
  referenceCodes: string[];
}

interface AnalyticItem {
  title: string;
  value: number;
  icon: React.ReactNode;
  change: string;
  trend: 'up' | 'down';
  color: string;
}

interface ChartDataItem {
  name: string;
  value: number;
  count?: number;
}

const RADIAN = Math.PI / 180;
const COLORS = [
  '#4361ee', '#3a0ca3', '#7209b7', '#f72585', '#4cc9f0',
  '#480ca8', '#3f37c9', '#4895ef', '#560bad', '#4361ee'
];

const GRADIENTS = [
  ['#4361ee', '#3a0ca3'],
  ['#7209b7', '#f72585'],
  ['#4cc9f0', '#480ca8'],
  ['#3f37c9', '#4895ef'],
  ['#560bad', '#4361ee']
];

const MarketingDashboard: React.FC = () => {
  const [marketingData, setMarketingData] = useState<MarketingEmployee[]>([]);
  const [filteredData, setFilteredData] = useState<MarketingEmployee[]>([]);
  const [dailyActivity, setDailyActivity] = useState<DailyActivityData[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedEcno, setSelectedEcno] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMarketingData();
  }, []);

  useEffect(() => {
    if (marketingData.length > 0) {
      processDailyActivity();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketingData]);

  useEffect(() => {
    fetchMarketingData();
    const handleFocus = () => fetchMarketingData();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const fetchMarketingData = async (): Promise<void> => {
    try {
      const response = await fetch('https://cust.spacetextiles.net/marketing-reports');
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const data = await response.json();
      
      const processedData = data.data
        .filter((item: MarketingEmployee) => item.division && item.branch);
      
      setMarketingData(processedData);
      setFilteredData(processedData);
      setLoading(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      setLoading(false);
    }
  };

  const processDailyActivity = () => {
    const activities = _.chain(marketingData)
      .filter((item: MarketingEmployee) => 
        // Fix: Return boolean instead of implicitly returning strings
        Boolean(item.timestamp) && Boolean(item.referenceCode)
      )
      .groupBy(item => {
        const date = new Date(item.timestamp);
        return date.toISOString().split('T')[0];
      })
      .map((items, date) => {
        const uniqueCodes = _.uniqBy(items, 'referenceCode')
          .map(item => item.referenceCode)
          .filter(Boolean);
  
        return {
          date,
          uniqueReferenceCodes: uniqueCodes.length,
          ecno: items[0].ecno,
          name: items[0].name,
          referenceCodes: uniqueCodes
        };
      })
      .value();
    
    setDailyActivity(activities);
  };
  const getAnalytics = (): AnalyticItem[] => {
    const totalEmployees = _.uniqBy(marketingData.filter(item => item.division), 'ecno').length;
    const uniqueDivisions = _.uniqBy(marketingData.filter(item => item.division), 'division').length;
    const uniqueLocations = _.uniqBy(marketingData.filter(item => item.location), 'location').length;
    const uniqueBranches = _.uniqBy(marketingData.filter(item => item.branch), 'branch').length;
    
    const today = new Date().toISOString().split('T')[0];
    const todayActivity = dailyActivity
      .filter(activity => activity.date === today)
      .reduce((sum, activity) => sum + activity.uniqueReferenceCodes, 0);

    return [
      {
        title: "Total Employees",
        value: totalEmployees,
        icon: <Users className='text-blue-500'size={24} />,
        change: "+12%",
        trend: "up",
        color: "blue-500"
      },
      {
        title: "Active Divisions",
        value: uniqueDivisions,
        icon: <Network className='text-purple-500' size={24} />,
        change: "+3",
        trend: "up",
        color: "purple-500"
      },
      {
        title: "Today's Activity",
        value: todayActivity,
        icon: <Activity className='text-green-500' size={24} />,
        change: "+15%",
        trend: "up",
        color: "green-500"
      },
      {
        title: "Total Locations",
        value: uniqueLocations,
        icon: <MapPin className='text-yellow-500' size={24} />,
        change: "+5",
        trend: "up",
        color: "yellow-500"
      },
      {
        title: "Active Branches",
        value: uniqueBranches,
        icon: <Building2 className='text-red-500' size={24} />,
        change: "-2",
        trend: "down",
        color: "red-500"
      }
    ];
  };

  const getDivisionData = (): ChartDataItem[] => {
    return _.chain(marketingData)
      .filter((item: MarketingEmployee) => Boolean(item.division))
      .groupBy('division')
      .map((items, division) => ({
        name: division || 'Unassigned',
        value: items.length
      }))
      .value();
  };
  
  const getBranchData = (): ChartDataItem[] => {
    return _.chain(marketingData)
      .filter((item: MarketingEmployee) => Boolean(item.branch))
      .groupBy('branch')
      .map((items, branch) => ({
        name: branch || 'Unassigned',
        count: items.length,
        value: items.length // Added for type compatibility
      }))
      .value();
  };
  const getActivityTrendData = () => {
    if (!selectedEcno || selectedEcno === "all") {
      return _.chain(dailyActivity)
        .groupBy('date')
        .map((activities, date) => ({
          date,
          totalCount: _.sumBy(activities, 'uniqueReferenceCodes')
        }))
        .orderBy('date')
        .value();
    }

    return _.chain(dailyActivity)
      .filter(activity => activity.ecno === selectedEcno)
      .map(activity => ({
        date: activity.date,
        count: activity.uniqueReferenceCodes
      }))
      .orderBy('date')
      .value();
  };

  interface CustomizedLabelProps {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent: number;
    index: number;
    name: string;
  }

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: CustomizedLabelProps) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 1.1;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const cos = Math.cos(-RADIAN * midAngle);
    const sin = Math.sin(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <path
          d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
          stroke={COLORS[0]}
          fill="none"
        />
        <circle cx={ex} cy={ey} r={2} fill={COLORS[0]} stroke="none" />
        <text
          x={ex + (cos >= 0 ? 1 : -1) * 12}
          y={ey}
          textAnchor={textAnchor}
          fill="#333"
          fontSize="12"
        >{`${name} (${(percent * 100).toFixed(1)}%)`}</text>
      </g>
    );
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    
    const filtered = marketingData.filter(item =>
      item.name.toLowerCase().includes(term) ||
      item.ecno.toLowerCase().includes(term) ||
      item.designation.toLowerCase().includes(term) ||
      item.division?.toLowerCase().includes(term) ||
      item.branch?.toLowerCase().includes(term)
    );
    
    setFilteredData(filtered);
  };

  const handleEcnoChange = (value: string) => {
    setSelectedEcno(value === "all" ? "" : value);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500 text-center">
          <h2 className="text-2xl font-bold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <PrivateRoute>
    <div className="min-h-screen bg-gray-50 p-8">
     <div className="relative h-20 sm:h-20 lg:h-20 w-full">
        <Image src="/SPACE LOGO 3D 03.png" alt="Company Logo" fill className="object-contain" priority/>
    </div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-blue-900 mb-2">Marketing Reports Dashboard</h1>
        <p className="text-sky-600">Comprehensive overview of marketing team performance and daily activities</p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
        {getAnalytics().map((item, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`bg-${item.color}/10 p-3 rounded-lg`}>
                  {item.icon}
                </div>
                <span className={`flex items-center ${
                  item.trend === 'up' ? 'text-green-500' : 'text-red-500'
                }`}>
                  {item.change}
                  {item.trend === 'up' ? 
                    <ArrowUpRight size={16} /> : 
                    <ArrowDownRight size={16} />
                  }
                </span>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-600">{item.title}</p>
                <p className="text-2xl font-bold text-gray-900">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity Trend Chart */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className='text-green-700'>Daily Activity Trend</CardTitle>
            <Select value={selectedEcno || "all"} onValueChange={handleEcnoChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {_.uniqBy(marketingData, 'ecno').map((emp, index) => (
                  <SelectItem key={`${emp.ecno}-${index}`} value={emp.ecno}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getActivityTrendData()}>
                <defs>
                  <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4361ee" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4361ee" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date"
                  tick={{ fill: '#374151', fontSize: 12 }}
                />
                <YAxis
                  tick={{ fill: '#374151', fontSize: 12 }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-4 rounded-lg shadow-lg border">
                          <p className="font-bold text-gray-900">{label}</p>
                          <p className="text-sky-600">
                            Activities: {payload[0].value}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={selectedEcno ? "count" : "totalCount"}
                  stroke="#4361ee"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorActivity)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Division Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className='text-blue-700'>Division Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    {GRADIENTS.map((colors, index) => (
                      <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={colors[0]} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={colors[1]} stopOpacity={0.9} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={getDivisionData()}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={140}
                    paddingAngle={5}
                    dataKey="value"
                    labelLine={true}
                    label={renderCustomizedLabel}
                  >
                    {getDivisionData().map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`url(#gradient-${index % GRADIENTS.length})`}
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-4 rounded-lg shadow-lg border">
                            <p className="font-bold text-gray-900">{payload[0].name}</p>
                            <p className="text-violet-600">
                              Count: {payload[0].value}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Branch Distribution */}
        <Card>
          <CardHeader>
            <CardTitle  className='text-purple-700'>Branch Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getBranchData()} layout="vertical">
                  <defs>
                    {GRADIENTS.map((colors, index) => (
                      <linearGradient key={`barGradient-${index}`} id={`barGradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={colors[0]} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={colors[1]} stopOpacity={0.9} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={150}
                    tick={{ fill: '#374151', fontSize: 12 }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-4 rounded-lg shadow-lg border">
                            <p className="font-bold text-gray-900">{label}</p>
                            <p className="text-gray-600">
                              Count: {payload[0].value}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    radius={[0, 4, 4, 0]}
                  >
                    {getBranchData().map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`url(#barGradient-${index % GRADIENTS.length})`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Details Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className='text-sky-700'>Marketing Team Details</CardTitle>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-sky-400" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="pl-10 w-64 text-blue-800"
                />
              </div>
              <button 
                className="flex items-center space-x-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50"
              >
                <Filter className="w-4 h-4 text-green-500" />
                <span className='text-green-800 font-semibold'>Filter</span>
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px] text-red-950 font-semibold">Employee Code</TableHead>
                  <TableHead className='text-red-950 font-semibold'>Name</TableHead>
                  <TableHead className='text-red-950 font-semibold'>Designation</TableHead>
                  <TableHead className='text-red-950 font-semibold'>Division</TableHead>
                  <TableHead className='text-red-950 font-semibold'>Branch</TableHead>
                  <TableHead className='text-red-950 font-semibold'>Location</TableHead>
                  <TableHead className='text-red-950 font-semibold'>Customer Location</TableHead>
                  <TableHead className="text-right text-red-950 font-semibold">Unique Reference Codes Today</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item, index) => {
                  const todayActivity = dailyActivity.find(
                    activity => 
                      activity.ecno === item.ecno && 
                      activity.date === new Date().toISOString().split('T')[0]
                  );
                  
                  return (
                    <TableRow key={`${item.ecno}-${index}`}>
                      <TableCell className="font-medium">{item.ecno}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.designation}</TableCell>
                      <TableCell>{item.division || 'N/A'}</TableCell>
                      <TableCell>{item.branch || 'N/A'}</TableCell>
                      <TableCell>{item.location || 'N/A'}</TableCell>
                      <TableCell>{item.customer_location || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end">
                          <span className="mr-2">{todayActivity?.uniqueReferenceCodes || 0}</span>
                          {(todayActivity?.uniqueReferenceCodes || 0) > 0 && (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
    </PrivateRoute>
  );
};

export default MarketingDashboard;