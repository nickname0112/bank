import React, { useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  BarChart3,
  Bot,
  Calendar,
  LoaderCircle,
  PieChart,
  Plus,
  Tag,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

const expenseColors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
const incomeColors = ['#3b82f6', '#06b6d4', '#14b8a6', '#22c55e', '#84cc16', '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#8b5cf6'];

const categories = {
  expense: ['식비', '교통비', '쇼핑', '문화/여가', '생활용품', '주거/통신', '기타'],
  income: ['월급', '부수입', '용돈', '이자', '기타'],
};

const getToday = () => new Date().toISOString().split('T')[0];
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://bank-tjkt.onrender.com' : '');
const getApiUrl = (path) => `${API_BASE_URL}${path}`;

const formatCurrency = (amount) => `${new Intl.NumberFormat('ko-KR').format(amount)}원`;

const DonutChart = ({ data, colors, typeLabel }) => {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  if (total === 0) {
    return <div className="flex h-48 items-center justify-center text-sm text-gray-400">내역이 없습니다</div>;
  }

  let currentOffset = 0;

  return (
    <div className="flex w-full flex-col items-center">
      <div className="relative h-40 w-40">
        <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90 transform">
          <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#e5e7eb" strokeWidth="6" />
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            if (percentage === 0) {
              return null;
            }

            const strokeDasharray = `${percentage} ${100 - percentage}`;
            const offset = 100 - currentOffset;
            currentOffset += percentage;

            return (
              <circle
                key={item.label}
                cx="21"
                cy="21"
                r="15.91549430918954"
                fill="transparent"
                stroke={colors[index % colors.length]}
                strokeWidth="6"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={offset}
                className="transition-all duration-500 ease-in-out"
              />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-gray-500">{typeLabel}</span>
          <span className="text-sm font-bold text-gray-800">{new Intl.NumberFormat('ko-KR').format(total)}</span>
        </div>
      </div>

      <div className="mt-6 grid w-full grid-cols-2 gap-x-4 gap-y-2 px-4 text-sm">
        {data.map((item, index) => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
              <span className="truncate text-gray-700" title={item.label}>
                {item.label}
              </span>
            </div>
            <span className="ml-2 font-medium text-gray-900">{Math.round((item.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('budget_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [formData, setFormData] = useState({
    type: 'expense',
    date: getToday(),
    category: categories.expense[0],
    amount: '',
    memo: '',
  });

  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState('');

  const [advisorForm, setAdvisorForm] = useState({
    age: '',
    monthlyInvestment: '',
    riskLevel: 'balanced',
    investmentGoal: '',
  });
  const [advisorResult, setAdvisorResult] = useState('');
  const [advisorError, setAdvisorError] = useState('');
  const [isAdvisorLoading, setIsAdvisorLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('budget_transactions', JSON.stringify(transactions));
  }, [transactions]);

  const { totalIncome, totalExpense, balance } = useMemo(
    () =>
      transactions.reduce(
        (acc, curr) => {
          if (curr.type === 'income') {
            acc.totalIncome += curr.amount;
            acc.balance += curr.amount;
          } else {
            acc.totalExpense += curr.amount;
            acc.balance -= curr.amount;
          }
          return acc;
        },
        { totalIncome: 0, totalExpense: 0, balance: 0 },
      ),
    [transactions],
  );

  const monthlyStats = useMemo(() => {
    const stats = {};

    transactions.forEach((transaction) => {
      const month = transaction.date.substring(0, 7);
      if (!stats[month]) {
        stats[month] = { income: 0, expense: 0 };
      }

      if (transaction.type === 'income') {
        stats[month].income += transaction.amount;
      } else {
        stats[month].expense += transaction.amount;
      }
    });

    return Object.entries(stats)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [transactions]);

  const categoryStats = useMemo(() => {
    const stats = { expense: {}, income: {} };

    transactions.forEach((transaction) => {
      stats[transaction.type][transaction.category] =
        (stats[transaction.type][transaction.category] || 0) + transaction.amount;
    });

    const normalize = (source) =>
      Object.entries(source)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);

    return {
      expense: normalize(stats.expense),
      income: normalize(stats.income),
    };
  }, [transactions]);

  const averageMonthlyIncome = useMemo(() => {
    if (monthlyStats.length === 0) {
      return 0;
    }

    return Math.round(monthlyStats.reduce((sum, item) => sum + item.income, 0) / monthlyStats.length);
  }, [monthlyStats]);

  const averageMonthlyExpense = useMemo(() => {
    if (monthlyStats.length === 0) {
      return 0;
    }

    return Math.round(monthlyStats.reduce((sum, item) => sum + item.expense, 0) / monthlyStats.length);
  }, [monthlyStats]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => {
      if (name === 'type') {
        return {
          ...prev,
          type: value,
          category: categories[value][0],
        };
      }

      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const handleAddTransaction = (event) => {
    event.preventDefault();

    if (!formData.amount || Number(formData.amount) <= 0) {
      window.alert('올바른 금액을 입력해 주세요.');
      return;
    }

    const newTransaction = {
      id: crypto.randomUUID(),
      type: formData.type,
      date: formData.date,
      category: formData.category,
      amount: Number(formData.amount),
      memo: formData.memo.trim(),
    };

    setTransactions((prev) => [newTransaction, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date)));
    setFormData((prev) => ({
      ...prev,
      amount: '',
      memo: '',
    }));
  };

  const handleDeleteTransaction = (id) => {
    setTransactions((prev) => prev.filter((transaction) => transaction.id !== id));
  };

  const handleDoubleClickAmount = (id, currentAmount) => {
    setEditingId(id);
    setEditAmount(String(currentAmount));
  };

  const handleSaveEditAmount = (id) => {
    const numericAmount = Number(editAmount);

    if (numericAmount === 0) {
      handleDeleteTransaction(id);
      setEditingId(null);
      return;
    }

    if (Number.isNaN(numericAmount) || numericAmount < 0) {
      window.alert('올바른 금액을 입력해 주세요.');
      setEditingId(null);
      return;
    }

    setTransactions((prev) =>
      prev.map((transaction) => (transaction.id === id ? { ...transaction, amount: numericAmount } : transaction)),
    );
    setEditingId(null);
  };

  const handleEditKeyDown = (event, id) => {
    if (event.key === 'Enter') {
      handleSaveEditAmount(id);
    } else if (event.key === 'Escape') {
      setEditingId(null);
    }
  };

  const handleAdvisorFieldChange = (event) => {
    const { name, value } = event.target;
    setAdvisorForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRequestAdvice = async (event) => {
    event.preventDefault();

    if (transactions.length === 0) {
      setAdvisorError('투자 조언을 받으려면 먼저 수입이나 지출 내역을 1건 이상 입력해 주세요.');
      setAdvisorResult('');
      return;
    }

    if (!advisorForm.monthlyInvestment || Number(advisorForm.monthlyInvestment) <= 0) {
      setAdvisorError('매달 투자 가능한 금액을 입력해 주세요.');
      setAdvisorResult('');
      return;
    }

    setIsAdvisorLoading(true);
    setAdvisorError('');

    try {
      const response = await fetch(getApiUrl('/api/investment-advice'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            age: advisorForm.age ? Number(advisorForm.age) : null,
            monthlyInvestment: Number(advisorForm.monthlyInvestment),
            riskLevel: advisorForm.riskLevel,
            investmentGoal: advisorForm.investmentGoal.trim(),
          },
          financialSummary: {
            balance,
            totalIncome,
            totalExpense,
            averageMonthlyIncome,
            averageMonthlyExpense,
            transactionCount: transactions.length,
            recentTransactions: transactions.slice(0, 8),
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '투자 조언 생성에 실패했습니다.');
      }

      setAdvisorResult(data.advice);
    } catch (error) {
      setAdvisorResult('');
      setAdvisorError(error.message || '투자 조언 생성 중 오류가 발생했습니다.');
    } finally {
      setIsAdvisorLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans text-gray-800 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Wallet className="text-blue-600" />
            스마트 가계부
          </h1>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-gray-500">
              <Wallet size={20} />
              <span className="font-medium">현재 잔액</span>
            </div>
            <div className={`text-3xl font-bold ${balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{formatCurrency(balance)}</div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-blue-500">
              <TrendingUp size={20} />
              <span className="font-medium">총 수입</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalIncome)}</div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-red-500">
              <TrendingDown size={20} />
              <span className="font-medium">총 지출</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                <Plus size={20} className="text-gray-400" />
                내역 추가
              </h2>

              <form onSubmit={handleAddTransaction} className="space-y-4">
                <div className="flex rounded-lg bg-gray-100 p-1">
                  <button
                    type="button"
                    onClick={() => handleInputChange({ target: { name: 'type', value: 'expense' } })}
                    className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                      formData.type === 'expense' ? 'bg-white text-red-600 shadow' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    지출
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange({ target: { name: 'type', value: 'income' } })}
                    className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                      formData.type === 'income' ? 'bg-white text-blue-600 shadow' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    수입
                  </button>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">날짜</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Calendar size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                      className="block w-full rounded-lg border border-gray-200 py-2 pl-10 pr-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">카테고리</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Tag size={16} className="text-gray-400" />
                    </div>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="block w-full appearance-none rounded-lg border border-gray-200 py-2 pl-10 pr-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    >
                      {categories[formData.type].map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">금액</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Banknote size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      placeholder="0"
                      min="1"
                      required
                      className="block w-full rounded-lg border border-gray-200 py-2 pl-10 pr-12 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">원</div>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">메모 (선택)</label>
                  <input
                    type="text"
                    name="memo"
                    value={formData.memo}
                    onChange={handleInputChange}
                    placeholder="상세 내용을 입력해 보세요"
                    className="block w-full rounded-lg border border-gray-200 px-3 py-2 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium text-white transition-colors ${
                    formData.type === 'income' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  <Plus size={18} />
                  {formData.type === 'income' ? '수입 추가' : '지출 추가'}
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900">최근 내역</h2>
                <span className="text-sm text-gray-500">총 {transactions.length}건</span>
              </div>

              <div className="overflow-x-auto">
                {transactions.length > 0 ? (
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-gray-50 text-sm text-gray-500">
                        <th className="p-4 font-medium">날짜</th>
                        <th className="p-4 font-medium">카테고리</th>
                        <th className="p-4 font-medium">메모</th>
                        <th className="p-4 text-right font-medium">금액</th>
                        <th className="p-4 text-center font-medium">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {transactions.map((transaction) => (
                        <tr key={transaction.id} className="transition-colors hover:bg-gray-50">
                          <td className="p-4 text-sm text-gray-600">{transaction.date}</td>
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                transaction.type === 'income' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {transaction.category}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-gray-800">{transaction.memo || '-'}</td>
                          <td
                            className={`cursor-text p-4 text-right font-medium ${
                              transaction.type === 'income' ? 'text-blue-600' : 'text-red-600'
                            }`}
                            onDoubleClick={() => handleDoubleClickAmount(transaction.id, transaction.amount)}
                            title="더블클릭해서 금액 수정"
                          >
                            {editingId === transaction.id ? (
                              <input
                                type="number"
                                value={editAmount}
                                onChange={(event) => setEditAmount(event.target.value)}
                                onBlur={() => handleSaveEditAmount(transaction.id)}
                                onKeyDown={(event) => handleEditKeyDown(event, transaction.id)}
                                autoFocus
                                className="w-24 border-b border-gray-400 bg-transparent text-right text-gray-900 outline-none focus:border-blue-500"
                              />
                            ) : (
                              <>{transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}</>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              className="p-1 text-gray-400 transition-colors hover:text-red-500"
                              aria-label="내역 삭제"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-12 text-center text-gray-500">
                    <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                      <Wallet className="text-gray-400" size={24} />
                    </div>
                    <p className="mb-1 text-lg font-medium text-gray-900">내역이 없습니다</p>
                    <p className="text-sm">왼쪽 폼에서 수입이나 지출을 먼저 추가해 주세요.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Bot className="text-blue-500" size={20} />
                <h2 className="text-lg font-bold text-gray-900">AI 투자 조언</h2>
              </div>

              <form onSubmit={handleRequestAdvice} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">나이 (선택)</label>
                  <input
                    type="number"
                    name="age"
                    value={advisorForm.age}
                    onChange={handleAdvisorFieldChange}
                    min="0"
                    placeholder="예: 29"
                    className="block w-full rounded-lg border border-gray-200 px-3 py-2 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">월 투자 가능 금액</label>
                  <input
                    type="number"
                    name="monthlyInvestment"
                    value={advisorForm.monthlyInvestment}
                    onChange={handleAdvisorFieldChange}
                    min="1"
                    placeholder="예: 300000"
                    className="block w-full rounded-lg border border-gray-200 px-3 py-2 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">위험 성향</label>
                  <select
                    name="riskLevel"
                    value={advisorForm.riskLevel}
                    onChange={handleAdvisorFieldChange}
                    className="block w-full rounded-lg border border-gray-200 px-3 py-2 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="conservative">안정형</option>
                    <option value="balanced">균형형</option>
                    <option value="aggressive">공격형</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">투자 목표</label>
                  <input
                    type="text"
                    name="investmentGoal"
                    value={advisorForm.investmentGoal}
                    onChange={handleAdvisorFieldChange}
                    placeholder="예: 5년 안에 종잣돈 만들기"
                    className="block w-full rounded-lg border border-gray-200 px-3 py-2 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600 md:col-span-2">
                  현재 가계부 요약: 잔액 {formatCurrency(balance)}, 총 수입 {formatCurrency(totalIncome)}, 총 지출 {formatCurrency(totalExpense)},
                  월평균 수입 {formatCurrency(averageMonthlyIncome)}, 월평균 지출 {formatCurrency(averageMonthlyExpense)} 정보를 함께 AI에 전달합니다.
                </div>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={isAdvisorLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                  >
                    {isAdvisorLoading ? <LoaderCircle size={18} className="animate-spin" /> : <Bot size={18} />}
                    {isAdvisorLoading ? 'Gemini가 조언을 작성하는 중...' : 'Gemini 투자 조언 받기'}
                  </button>
                </div>
              </form>

              {advisorError ? <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{advisorError}</p> : null}

              <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="mb-2 text-sm font-medium text-gray-700">AI 응답</p>
                {advisorResult ? (
                  <div className="whitespace-pre-wrap text-sm leading-6 text-gray-700">{advisorResult}</div>
                ) : (
                  <p className="text-sm text-gray-500">가계부 데이터와 투자 조건을 바탕으로 주식 투자 조언을 생성합니다.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <PieChart className="text-gray-400" size={20} />
            <h2 className="text-lg font-bold text-gray-900">카테고리별 통계</h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-6">
              <h3 className="mb-6 text-center text-md font-semibold text-gray-700">지출 카테고리</h3>
              <DonutChart data={categoryStats.expense} colors={expenseColors} typeLabel="총 지출" />
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-6">
              <h3 className="mb-6 text-center text-md font-semibold text-gray-700">수입 카테고리</h3>
              <DonutChart data={categoryStats.income} colors={incomeColors} typeLabel="총 수입" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="text-gray-400" size={20} />
            <h2 className="text-lg font-bold text-gray-900">월별 요약</h2>
          </div>

          {monthlyStats.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {monthlyStats.map((stat) => (
                <div
                  key={stat.month}
                  className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50 p-4 transition-transform hover:-translate-y-1 hover:shadow-sm"
                >
                  <div className="mb-1 border-b border-gray-200 pb-2 font-bold text-gray-800">
                    {stat.month.split('-')[0]}년 {stat.month.split('-')[1]}월
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">지출</span>
                    <span className="font-semibold text-red-600">{formatCurrency(stat.expense)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">수입</span>
                    <span className="font-semibold text-blue-600">{formatCurrency(stat.income)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between border-t border-gray-200 pt-2 text-sm">
                    <span className="font-medium text-gray-700">합계</span>
                    <span className={`font-bold ${stat.income - stat.expense >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {stat.income - stat.expense > 0 ? '+' : ''}
                      {formatCurrency(stat.income - stat.expense)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-gray-500">월별 데이터가 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}
