import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  LayoutDashboard, 
  Package, 
  Bot, 
  Plus, 
  Search, 
  FileText, 
  X, 
  Save, 
  Loader2,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Download,
  Upload,
  Database
} from 'lucide-react';
import { Product, AppView, InventoryStats, ChatMessage } from './types';
import InventoryTable from './components/InventoryTable';
import * as GeminiService from './services/geminiService';

const App: React.FC = () => {
  // --- State ---
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', category: '', quantity: 0, price: 0, description: ''
  });
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  // AI Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // --- Effects ---
  useEffect(() => {
    // Load from local storage on mount
    const saved = localStorage.getItem('inventory_data');
    if (saved) {
      setProducts(JSON.parse(saved));
    } else {
        // Seed initial dummy data if empty
        const initialData: Product[] = [
            { id: '1', name: 'Wireless Mouse', category: 'Electronics', quantity: 45, price: 850.00, description: 'Ergonomic wireless mouse', lastUpdated: new Date().toISOString() },
            { id: '2', name: 'Mechanical Keyboard', category: 'Electronics', quantity: 12, price: 4500.00, description: 'RGB mechanical keyboard', lastUpdated: new Date().toISOString() },
            { id: '3', name: 'Office Chair', category: 'Furniture', quantity: 3, price: 12000.00, description: 'Mesh ergonomic chair', lastUpdated: new Date().toISOString() }
        ];
        setProducts(initialData);
        localStorage.setItem('inventory_data', JSON.stringify(initialData));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('inventory_data', JSON.stringify(products));
  }, [products]);

  // --- Computed Stats ---
  const stats: InventoryStats = useMemo(() => {
    return {
      totalProducts: products.reduce((acc, curr) => acc + curr.quantity, 0),
      totalValue: products.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0),
      lowStockItems: products.filter(p => p.quantity < 5).length,
      categories: new Set(products.map(p => p.category)).size
    };
  }, [products]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Handlers ---

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData(product);
    } else {
      setEditingProduct(null);
      setFormData({ name: '', category: '', quantity: 0, price: 0, description: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'price' ? parseFloat(value) || 0 : value
    }));
  };

  // AI Auto-Fill Feature
  const handleAutoFill = async () => {
    if (!formData.name) return;
    setIsAutoFilling(true);
    const suggestion = await GeminiService.suggestProductDetails(formData.name);
    setFormData(prev => ({
      ...prev,
      category: suggestion.category,
      description: suggestion.description
    }));
    setIsAutoFilling(false);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.price === undefined || formData.quantity === undefined) return;

    if (editingProduct) {
      const updatedProducts = products.map(p => 
        p.id === editingProduct.id 
          ? { ...p, ...formData, lastUpdated: new Date().toISOString() } as Product 
          : p
      );
      setProducts(updatedProducts);
    } else {
      const newProduct: Product = {
        id: crypto.randomUUID(),
        name: formData.name,
        category: formData.category || 'General',
        quantity: formData.quantity,
        price: formData.price,
        description: formData.description || '',
        lastUpdated: new Date().toISOString()
      };
      setProducts([...products, newProduct]);
    }
    handleCloseModal();
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Inventory Report", 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    // Use unicode for Taka symbol or just 'BDT' if font support issues arise, 
    // but here we use a simple label to ensure PDF compatibility standard fonts
    doc.text(`Total Value: BDT ${stats.totalValue.toLocaleString('en-BD')}`, 14, 36);

    const tableData = filteredProducts.map(p => [
      p.name,
      p.category,
      p.quantity.toString(),
      `${p.price.toLocaleString('en-BD')}`,
      p.description
    ]);

    autoTable(doc, {
      head: [['Name', 'Category', 'Qty', 'Price (BDT)', 'Description']],
      body: tableData,
      startY: 44,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] }
    });

    doc.save(`inventory_report_${Date.now()}.pdf`);
  };

  // Backup & Restore Handlers
  const handleBackup = () => {
    const dataStr = JSON.stringify(products, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `smart_inventory_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedData)) {
          // Simple validation
          const isValid = importedData.every(item => 'name' in item && 'price' in item);
          if (isValid) {
            setProducts(importedData);
            alert("Inventory database restored successfully!");
          } else {
            alert("Invalid file structure.");
          }
        } else {
          alert("Invalid file format.");
        }
      } catch (err) {
        alert("Error reading file.");
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = {
      role: 'user',
      text: chatInput,
      timestamp: new Date()
    };
    
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsAiThinking(true);

    const responseText = await GeminiService.analyzeInventory(products, userMsg.text);

    const aiMsg: ChatMessage = {
      role: 'model',
      text: responseText,
      timestamp: new Date()
    };

    setChatHistory(prev => [...prev, aiMsg]);
    setIsAiThinking(false);
  };

  // --- Renders ---

  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Backup/Restore Utility Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
        <div className="flex items-center space-x-2 mb-3 sm:mb-0">
          <Database className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">Data Management (Permanent Storage)</span>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={handleBackup}
            className="flex items-center px-3 py-1.5 bg-white text-slate-700 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 mr-2" /> Backup JSON
          </button>
          <label className="flex items-center px-3 py-1.5 bg-white text-slate-700 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer">
            <Upload className="w-4 h-4 mr-2" /> Restore JSON
            <input type="file" hidden onChange={handleRestore} accept=".json" />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Items</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.totalProducts}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            {/* Taka/Money Icon */}
            <span className="text-2xl font-bold">৳</span>
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Value</p>
            <h3 className="text-2xl font-bold text-slate-800">
              ৳{stats.totalValue.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Low Stock</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.lowStockItems}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Categories</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.categories}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Recent Live Inventory</h2>
        <InventoryTable products={products.slice(0, 5)} onEdit={handleOpenModal} onDelete={handleDeleteProduct} />
        <button 
          onClick={() => setView(AppView.INVENTORY)}
          className="mt-4 text-sm text-blue-600 font-medium hover:text-blue-700 hover:underline"
        >
          View all items &rarr;
        </button>
      </div>
    </div>
  );

  const renderInventory = () => (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search products..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex space-x-2 w-full sm:w-auto">
          <button 
            onClick={exportPDF}
            className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium text-sm"
          >
            <FileText className="w-4 h-4 mr-2" /> Export PDF
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-md shadow-blue-200"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <InventoryTable products={filteredProducts} onEdit={handleOpenModal} onDelete={handleDeleteProduct} />
      </div>
    </div>
  );

  const renderAiAssistant = () => (
    <div className="bg-white h-[calc(100vh-8rem)] rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Bot className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Inventory Assistant</h3>
            <p className="text-xs text-slate-500">Powered by Gemini 2.5 Flash</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {chatHistory.length === 0 && (
          <div className="text-center text-slate-400 mt-10">
            <Bot className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Ask me anything about your inventory.</p>
            <p className="text-sm mt-2">"Which items are low on stock?"</p>
            <p className="text-sm">"What is the total value of Electronics?"</p>
          </div>
        )}
        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {isAiThinking && (
           <div className="flex justify-start">
             <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center space-x-2">
               <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
               <span className="text-xs text-slate-500">Analyzing inventory...</span>
             </div>
           </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
          className="flex space-x-2"
        >
          <input
            type="text"
            className="flex-1 border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Ask about your products..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
          />
          <button 
            type="submit"
            disabled={!chatInput.trim() || isAiThinking}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background font-sans">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-white border-r border-slate-200 flex flex-col fixed inset-y-0 z-10 transition-all duration-300">
        <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-slate-100">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            S
          </div>
          <span className="ml-3 font-bold text-xl text-slate-800 hidden lg:block">SmartInv</span>
        </div>

        <nav className="flex-1 py-6 space-y-2 px-2 lg:px-4">
          <button
            onClick={() => setView(AppView.DASHBOARD)}
            className={`w-full flex items-center p-3 rounded-lg transition-colors ${
              view === AppView.DASHBOARD ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 lg:mr-3" />
            <span className="hidden lg:block font-medium">Dashboard</span>
          </button>
          
          <button
            onClick={() => setView(AppView.INVENTORY)}
            className={`w-full flex items-center p-3 rounded-lg transition-colors ${
              view === AppView.INVENTORY ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Package className="w-5 h-5 lg:mr-3" />
            <span className="hidden lg:block font-medium">Inventory</span>
          </button>

          <button
            onClick={() => setView(AppView.AI_ASSISTANT)}
            className={`w-full flex items-center p-3 rounded-lg transition-colors ${
              view === AppView.AI_ASSISTANT ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Bot className="w-5 h-5 lg:mr-3" />
            <span className="hidden lg:block font-medium">AI Assistant</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center space-x-3 text-slate-500 text-sm hidden lg:flex">
             <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
             <span>System Online</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-20 lg:ml-64 p-4 lg:p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {view === AppView.DASHBOARD && 'Overview'}
              {view === AppView.INVENTORY && 'Product Management'}
              {view === AppView.AI_ASSISTANT && 'AI Insights'}
            </h1>
            <p className="text-slate-500 text-sm mt-1">Manage your store efficiently.</p>
          </div>
          <div className="hidden sm:block">
            <span className="text-sm font-medium text-slate-600 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </header>

        {view === AppView.DASHBOARD && renderDashboard()}
        {view === AppView.INVENTORY && renderInventory()}
        {view === AppView.AI_ASSISTANT && renderAiAssistant()}

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-slate-200 text-center text-slate-400 text-sm">
          <p>&copy; {new Date().getFullYear()} SmartInventory AI. All rights reserved.</p>
          <p className="text-xs mt-1">Version 1.0.0 &bull; Secure Local Storage &bull; Gemini Powered</p>
        </footer>
      </main>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product Name</label>
                <div className="flex space-x-2">
                  <input 
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Wireless Headset"
                  />
                  <button
                    type="button"
                    onClick={handleAutoFill}
                    disabled={!formData.name || isAutoFilling}
                    className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors flex items-center whitespace-nowrap"
                    title="Auto-generate Category and Description using AI"
                  >
                    {isAutoFilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4 mr-1" />}
                    Auto Fill
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Price (৳)</label>
                  <input 
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.price}
                    onChange={handleInputChange}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                  <input 
                    name="quantity"
                    type="number"
                    min="0"
                    required
                    value={formData.quantity}
                    onChange={handleInputChange}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <input 
                  name="category"
                  list="categories"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Select or type category"
                />
                <datalist id="categories">
                  <option value="Electronics" />
                  <option value="Furniture" />
                  <option value="Clothing" />
                  <option value="Office Supplies" />
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea 
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Short product description..."
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-md shadow-blue-200 flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;