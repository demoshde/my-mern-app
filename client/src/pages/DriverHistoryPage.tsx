import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Package, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { driversAPI } from '../lib/api';
import { format } from 'date-fns';
import type { Driver, Transaction } from '../types';
import toast from 'react-hot-toast';

export default function DriverHistoryPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchData();
  }, [id, page]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [driverRes, historyRes] = await Promise.all([
        driversAPI.getById(id!),
        driversAPI.getHistory(id!, { limit, skip: page * limit }),
      ]);
      setDriver(driverRes.data);
      setTransactions(historyRes.data.transactions);
      setTotal(historyRes.data.total);
    } catch (error) {
      toast.error('Failed to fetch driver history');
      navigate('/drivers');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !driver) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!driver) {
    return null;
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/drivers')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{driver.name}</h1>
          <p className="text-gray-500">Transaction History</p>
        </div>
      </div>

      {/* Driver Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
            {driver.photo ? (
              <img
                src={driver.photo}
                alt={driver.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-400">
                {driver.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">Employee ID: {driver.employeeId}</p>
            {driver.department && (
              <p className="text-sm text-gray-500">Department: {driver.department}</p>
            )}
            {driver.email && <p className="text-sm text-gray-500">{driver.email}</p>}
            {driver.phone && <p className="text-sm text-gray-500">{driver.phone}</p>}
          </div>
        </div>

        {/* Currently Issued Items */}
        {driver.currentlyIssuedItems && driver.currentlyIssuedItems.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-500" />
              Currently Issued Items
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {driver.currentlyIssuedItems.map((issued, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg"
                >
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                    {typeof issued.item === 'object' && issued.item?.photo ? (
                      <img
                        src={issued.item.photo}
                        alt=""
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Package className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {typeof issued.item === 'object' ? issued.item?.name : 'Unknown Item'}
                    </p>
                    <p className="text-xs text-gray-500">Qty: {issued.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
          <p className="text-sm text-gray-500">{total} total transactions</p>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No transactions found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <div key={transaction._id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start gap-4">
                  <div
                    className={`p-2 rounded-lg ${
                      transaction.type === 'issue'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-green-100 text-green-600'
                    }`}
                  >
                    {transaction.type === 'issue' ? (
                      <ArrowUpCircle className="w-5 h-5" />
                    ) : (
                      <ArrowDownCircle className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 capitalize">
                        {transaction.type === 'issue' ? 'PPE Issued' : 'PPE Returned'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(transaction.transactionDate), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <div className="mt-2 space-y-1">
                      {transaction.items.map((item, idx) => (
                        <p key={idx} className="text-sm text-gray-600">
                          {typeof item.item === 'object' ? item.item?.name : item.itemName} × {item.quantity}
                          {item.condition && item.condition !== 'new' && (
                            <span className="ml-2 text-gray-400">({item.condition})</span>
                          )}
                        </p>
                      ))}
                    </div>
                    {transaction.notes && (
                      <p className="mt-2 text-sm text-gray-500 italic">"{transaction.notes}"</p>
                    )}
                    {transaction.performedBy && (
                      <p className="mt-2 text-xs text-gray-400">
                        By: {transaction.performedBy.username}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
