import React from 'react';
import { Product } from '../types';
import { Edit, Trash2, AlertTriangle } from 'lucide-react';

interface Props {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

const InventoryTable: React.FC<Props> = ({ products, onEdit, onDelete }) => {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="text-slate-400 mb-2">
           <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/><line x1="17.5" y1="16" x2="17.5" y2="16"/></svg>
        </div>
        <p className="text-lg font-medium text-slate-600">No products found</p>
        <p className="text-sm text-slate-400">Add a new product to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-slate-200">
      <table className="w-full text-left text-sm text-slate-600">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
          <tr>
            <th className="px-6 py-4">Product Name</th>
            <th className="px-6 py-4">Category</th>
            <th className="px-6 py-4 text-center">Quantity</th>
            <th className="px-6 py-4 text-right">Price</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 font-medium text-slate-900">
                <div>{product.name}</div>
                <div className="text-xs text-slate-400 font-normal truncate max-w-[200px]">{product.description}</div>
              </td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                  {product.category}
                </span>
              </td>
              <td className="px-6 py-4 text-center font-mono">{product.quantity}</td>
              <td className="px-6 py-4 text-right font-mono">
                ৳{product.price.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-6 py-4">
                {product.quantity < 5 ? (
                  <span className="flex items-center text-amber-600 text-xs font-semibold">
                    <AlertTriangle className="w-3 h-3 mr-1" /> Low Stock
                  </span>
                ) : (
                  <span className="text-emerald-600 text-xs font-semibold">In Stock</span>
                )}
              </td>
              <td className="px-6 py-4 text-center">
                <div className="flex items-center justify-center space-x-2">
                  <button
                    onClick={() => onEdit(product)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(product.id)}
                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryTable;