import { useMemo } from 'react';
import { LineChart, Line, ComposedChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Transaction } from '../../types';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../utils/formatters';
import { t } from '../../utils/i18n';
import { convertCurrency } from '../../utils/exchange';

interface ChartsProps {
  transactions: Transaction[];
  currency: string;
  language: 'tr' | 'en';
  selectedMonth?: number;
  selectedYear?: number;
}

const COLORS = {
  income: '#10b981',
  expense: '#ef4444',
  savings: '#8b5cf6',
  netWorth: '#3b82f6',
  categories: ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'],
};

// Universal dark tooltip style (works in both light and dark mode)
const TOOLTIP_STYLE = {
  backgroundColor: '#1e293b',
  border: 'none',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '12px',
  padding: '8px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
};

export function Charts({ transactions, currency, language, selectedMonth = 0, selectedYear = 2024 }: ChartsProps) {
  // Custom bar label that formats to currency (2 decimals)
  const renderBarLabel = (props: any) => {
    const { x, y, value, width } = props;
    const cx = x + (width || 0) / 2;
    return (
      <text
        x={cx}
        y={(y || 0) - 4}
        fill="#64748b"
        fontSize={10}
        style={{ fontWeight: 600 }}
        textAnchor="middle"
      >
        {formatCurrency(Number(value || 0), currency as any)}
      </text>
    );
  };
  // Calculate monthly data - all months
  const { monthlyList, monthlyMap } = useMemo(() => {
    const dataByMonth: Record<string, { income: number; expense: number; savings: number; month: string }> = {};
    
    transactions.forEach((t) => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const from = (t as any).originalCurrency || 'TRY';
      const amt = from === currency ? t.amount : convertCurrency(t.amount, from, currency);
      
      if (!dataByMonth[monthKey]) {
        dataByMonth[monthKey] = { 
          income: 0, 
          expense: 0,
          savings: 0,
          month: new Date(date.getFullYear(), date.getMonth(), 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        };
      }
      
      if (t.type === 'income') {
        dataByMonth[monthKey].income += amt;
      } else if (t.type === 'expense') {
        dataByMonth[monthKey].expense += amt;
      } else if (t.type === 'savings') {
        dataByMonth[monthKey].savings += amt;
      } else if (t.type === 'withdrawal') {
        dataByMonth[monthKey].savings -= amt;
      }
    });

    const monthlyList = Object.entries(dataByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, data]) => data);

    return { monthlyList, monthlyMap: dataByMonth };
  }, [transactions, currency]);
  
  // Get only selected month data for cash flow and pie chart
  const selectedMonthData = useMemo(() => {
    const date = new Date(selectedYear, selectedMonth, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return monthlyMap[monthKey] || { income: 0, expense: 0, savings: 0, month: 'N/A' };
  }, [monthlyMap, selectedMonth, selectedYear]);

  const recentThreeMonths = useMemo(() => {
    const items = [] as { income: number; expense: number; savings: number; month: string }[];
    for (let i = 2; i >= 0; i -= 1) {
      const date = new Date(selectedYear, selectedMonth - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      items.push(
        monthlyMap[key] || { income: 0, expense: 0, savings: 0, month: label }
      );
    }
    return items;
  }, [monthlyMap, selectedMonth, selectedYear]);

  // Calculate cumulative wealth
  const wealthData = useMemo(() => {
    let cumulative = 0;
    return monthlyList.map((month) => {
      cumulative += month.income - month.expense;
      return {
        ...month,
        wealth: cumulative,
      };
    });
  }, [monthlyList]);

  if (transactions.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-slate-500 dark:text-slate-400">
          {t('noDataCharts', language)}
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Wealth Accumulation - Line Chart */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{t('wealth', language)}</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={wealthData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
              stroke="#94a3b8"
            />
            <YAxis 
              width={50}
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
              stroke="#94a3b8"
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: number) => [formatCurrency(value, currency as any), language === 'tr' ? 'Toplam Servet' : 'Total Wealth']}
            />
            <Line 
              type="monotone" 
              dataKey="wealth" 
              stroke={COLORS.netWorth} 
              strokeWidth={2}
              dot={{ fill: COLORS.netWorth, r: 3 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false} 
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Cash Flow - Bar Chart - Selected Month and Previous 2 Months */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{t('cashFlow', language)}</h3>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={recentThreeMonths} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
              stroke="#94a3b8"
            />
            <YAxis 
              width={45}
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
              stroke="#94a3b8"
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: number) => formatCurrency(value, currency as any)}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px', color: '#64748b', fontWeight: 600 }} />
            <Bar dataKey="income" fill={COLORS.income} name={language === 'tr' ? 'Gelir' : 'Income'} radius={[4, 4, 0, 0]} barSize={20} isAnimationActive={false} label={{ content: renderBarLabel }} />
            <Bar dataKey="expense" fill={COLORS.expense} name={language === 'tr' ? 'Gider' : 'Expense'} radius={[4, 4, 0, 0]} barSize={20} isAnimationActive={false} label={{ content: renderBarLabel }} />
            <Bar dataKey="savings" fill={COLORS.savings} name={language === 'tr' ? 'Tasarruf' : 'Savings'} radius={[4, 4, 0, 0]} barSize={20} isAnimationActive={false} label={{ content: renderBarLabel }} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* Income/Expense/Savings Ratio - Pie Chart - Selected Month Only */}
      <Card className="p-4" key="pie-chart">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
          {language === 'tr' ? 'Gelir/Gider/Tasarruf Oranı' : 'Income/Expense/Savings Ratio'}
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          {useMemo(() => {
            const pieData = [];
            
            if (selectedMonthData.income > 0) {
              pieData.push({
                name: language === 'tr' ? 'Gelir' : 'Income',
                value: selectedMonthData.income
              });
            }
            if (selectedMonthData.expense > 0) {
              pieData.push({
                name: language === 'tr' ? 'Gider' : 'Expense',
                value: selectedMonthData.expense
              });
            }
            if (selectedMonthData.savings > 0) {
              pieData.push({
                name: language === 'tr' ? 'Tasarruf' : 'Savings',
                value: selectedMonthData.savings
              });
            } else if (selectedMonthData.savings < 0) {
              pieData.push({
                name: language === 'tr' ? 'Tasarruftan Çıkış' : 'Withdrawal',
                value: Math.abs(selectedMonthData.savings)
              });
            }

            const renderLabel = ({ cx, cy, midAngle, outerRadius, name, percent }: any) => {
              const RADIAN = Math.PI / 180;
              const radius = outerRadius + 30;
              const x = cx + radius * Math.cos(-midAngle * RADIAN);
              const y = cy + radius * Math.sin(-midAngle * RADIAN);

              return (
                <text 
                  x={x} 
                  y={y} 
                  fill="#0f172a"
                  textAnchor={x > cx ? 'start' : 'end'} 
                  dominantBaseline="central"
                  className="text-xs font-medium dark:fill-white"
                  fontSize={10}
                >
                  {`${name} ${((percent || 0) * 100).toFixed(0)}%`}
                </text>
              );
            };

            return (
              <PieChart margin={{ top: 12, right: 12, left: 12, bottom: 12 }} key="pie-chart-inner">
                <Pie
                  key={`pie-${language}`}
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  label={renderLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell 
                      fill={
                        entry.name === (language === 'tr' ? 'Gelir' : 'Income') ? COLORS.income :
                        entry.name === (language === 'tr' ? 'Gider' : 'Expense') ? COLORS.expense :
                        entry.name === (language === 'tr' ? 'Tasarruf' : 'Savings') ? COLORS.savings :
                        '#f97316'
                      }
                      key={`cell-${index}-${language}`}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value: number) => formatCurrency(value, currency as any)}
                />
              </PieChart>
            );
          }, [selectedMonthData, language, currency])}
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
