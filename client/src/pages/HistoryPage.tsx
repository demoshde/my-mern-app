import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Calendar,
  User,
  Package,
} from 'lucide-react';
import { transactionsAPI } from '../lib/api';
import { mn } from '../lib/i18n';
import { format } from 'date-fns';
import type { Transaction } from '../types';
import toast from 'react-hot-toast';

export default function HistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 20;

  const [filters, setFilters] = useState({
    type: searchParams.get('type') || '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
  });

  useEffect(() => {
    fetchTransactions();
  }, [page, filters]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const params: any = { limit, skip: page * limit };
      if (filters.type) params.type = filters.type;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await transactionsAPI.getAll(params);
      setTransactions(response.data.transactions);
      setTotal(response.data.total);
    } catch (error) {
      toast.error('Failed to fetch transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
    setPage(0);
    
    if (value) {
      searchParams.set(key, value);
    } else {
      searchParams.delete(key);
    }
    setSearchParams(searchParams);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{mn.nav.history}</h1>
        <p className="text-gray-500">{mn.history.title}</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">{mn.history.all}</option>
            <option value="issue">{mn.history.issues}</option>
            <option value="return">{mn.history.returns}</option>
          </select>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={mn.history.startDate}
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={mn.history.endDate}
            />
          </div>
          <button
            onClick={() => {
              setFilters({ type: '', startDate: '', endDate: '' });
              setSearchParams({});
            }}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {mn.app.clear}
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <p className="text-sm text-gray-500">{total} {mn.history.title}</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{mn.app.noData}</h3>
            <p className="text-gray-500">
              {filters.type || filters.startDate || filters.endDate
                ? 'Try adjusting your filters'
                : 'Transactions will appear here after issuing or returning PPE'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {transactions.map((transaction) => {
              const driver = transaction.driver as any;
              
              return (
                <div
                  key={transaction._id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={`p-3 rounded-lg ${
                        transaction.type === 'issue'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-green-100 text-green-600'
                      }`}
                    >
                      {transaction.type === 'issue' ? (
                        <ArrowUpCircle className="w-6 h-6" />
                      ) : (
                        <ArrowDownCircle className="w-6 h-6" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                        <div>
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              transaction.type === 'issue'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {transaction.type === 'issue' ? mn.dashboard.issued : mn.dashboard.returned}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {format(new Date(transaction.transactionDate), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>

                      {/* Driver Info */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center">
                          {driver?.photo ? (
                            <img
                              src={driver.photo}
                              alt={driver.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {driver?.name || 'Unknown Driver'}
                          </p>
                          <p className="text-xs text-gray-500">{driver?.employeeId}</p>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="flex flex-wrap gap-2">
                        {transaction.items.map((item, idx) => {
                          const ppeItem = item.item as any;
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg text-sm"
                            >
                              {ppeItem?.photo ? (
                                <img
                                  src={ppeItem.photo}
                                  alt=""
                                  className="w-5 h-5 rounded object-cover"
                                />
                              ) : (
                                <Package className="w-4 h-4 text-gray-400" />
                              )}
                              <span>
                                {ppeItem?.name || item.itemName} × {item.quantity}
                              </span>
                              {item.condition && item.condition !== 'new' && (
                                <span className="text-gray-400">({item.condition})</span>
                              )}
                              {item.earlyIssueReason && (
                                <span className="text-amber-600 text-xs ml-1">
                                  ({item.earlyIssueReason === 'lost' ? mn.issue.reasonLost :
                                    item.earlyIssueReason === 'damaged' ? mn.issue.reasonDamaged :
                                    item.earlyIssueReason === 'not_suitable' ? mn.issue.reasonNotSuitable :
                                    mn.issue.reasonOther})
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Notes */}
                      {transaction.notes && (
                        <p className="mt-2 text-sm text-gray-500 italic">
                          "{transaction.notes}"
                        </p>
                      )}

                      {/* Performed By */}
                      {transaction.performedBy && (
                        <p className="mt-2 text-xs text-gray-400">
                          {mn.history.issuedBy}: {transaction.performedBy.username}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mn.app.back}
            </button>
            <span className="text-sm text-gray-500">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Дараах
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
