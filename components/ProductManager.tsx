import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { Plus, Edit2, Trash2, X, Save, Search, Package, Box, Tag, ArrowUpDown, DollarSign } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    products: Product[];
    onSave: (product: Product) => void;
    onDelete: (id: string) => void;
}

type SortField = 'name' | 'unitPrice' | 'sku' | 'vatRate';
type SortOrder = 'asc' | 'desc';

const formatUnit = (unit: string): string => {
    const unitMap: Record<string, string> = {
        'ks': 'pcs',
        'hod': 'hours',
        'h': 'hours',
        'den': 'days',
        'm': 'm',
        'm2': 'm²',
        'kg': 'kg',
        'km': 'km',
        'bal': 'pkg',
        'mes': 'mo',
        'paušál': 'flat fee',
        'set': 'set'
    };
    return unitMap[unit] || unit;
};

const ProductManager: React.FC<Props> = ({ products, onSave, onDelete }) => {
    const { t } = useAppStore();
    const [isEditing, setIsEditing] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

    const handleEdit = (product: Product) => {
        setCurrentProduct(product);
        setIsEditing(true);
    };

    const handleAdd = () => {
        setCurrentProduct({
            id: Math.random().toString(36).substr(2, 9),
            name: '',
            description: '',
            unitPrice: 0,
            vatRate: 20,
            unit: 'ks',
            sku: ''
        });
        setIsEditing(true);
    };

    const handleSave = () => {
        if (!currentProduct) return;
        if (!currentProduct.name) {
            alert("Product Name is required");
            return;
        }
        onSave(currentProduct);
        setIsEditing(false);
        setCurrentProduct(null);
    };

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const filteredAndSortedProducts = useMemo(() => {
        return products
            .filter(p =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => {
                const aVal = a[sortField];
                const bVal = b[sortField];

                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    return sortOrder === 'asc'
                        ? aVal.localeCompare(bVal)
                        : bVal.localeCompare(aVal);
                }

                return sortOrder === 'asc'
                    ? (aVal as number) - (bVal as number)
                    : (bVal as number) - (aVal as number);
            });
    }, [products, searchTerm, sortField, sortOrder]);

    const inputClass = "w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand-light outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 text-sm";
    const labelClass = "block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5";

    if (isEditing && currentProduct) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-10 max-w-3xl mx-auto my-4 md:my-8 transition-colors"
            >
                <div className="flex justify-between items-center mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-brand/10 rounded-2xl">
                            <Package className="w-6 h-6 text-brand" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {products.find(p => p.id === currentProduct.id) ? "Edit Product" : "Add Product"}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Define your product or service details</p>
                        </div>
                    </div>
                    <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-50 rounded-xl">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-2">
                        <label className={labelClass}>Product / Service Name *</label>
                        <input
                            value={currentProduct.name}
                            onChange={e => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                            className={inputClass}
                            placeholder="e.g. Website Development"
                        />
                    </div>

                    <div className="col-span-2">
                        <label className={labelClass}>Description</label>
                        <textarea
                            value={currentProduct.description}
                            onChange={e => setCurrentProduct({ ...currentProduct, description: e.target.value })}
                            className={`${inputClass} min-h-[100px] resize-none`}
                            placeholder="Detailed description of the service..."
                        />
                    </div>

                    <div>
                        <label className={labelClass}>SKU / Code</label>
                        <div className="relative">
                            <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={currentProduct.sku}
                                onChange={e => setCurrentProduct({ ...currentProduct, sku: e.target.value })}
                                className={`${inputClass} pl-10`}
                                placeholder="PROD-001"
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Unit</label>
                        <select
                            value={currentProduct.unit}
                            onChange={e => setCurrentProduct({ ...currentProduct, unit: e.target.value })}
                            className={inputClass}
                        >
                            <option value="ks">pcs</option>
                            <option value="hod">hours</option>
                            <option value="den">days</option>
                            <option value="m2">m²</option>
                            <option value="kg">kg</option>
                            <option value="paušál">flat fee</option>
                        </select>
                    </div>

                    <div>
                        <label className={labelClass}>Unit Price (excluding VAT)</label>
                        <div className="relative">
                            <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="number"
                                value={currentProduct.unitPrice}
                                onChange={e => setCurrentProduct({ ...currentProduct, unitPrice: parseFloat(e.target.value) || 0 })}
                                className={`${inputClass} pl-10`}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>VAT Rate (%)</label>
                        <select
                            value={currentProduct.vatRate}
                            onChange={e => setCurrentProduct({ ...currentProduct, vatRate: parseInt(e.target.value) })}
                            className={inputClass}
                        >
                            <option value={20}>20% (Standard)</option>
                            <option value={10}>10% (Reduced)</option>
                            <option value={0}>0% (Exempt)</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-10 pt-8 border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={() => setIsEditing(false)}
                        className="px-8 py-3 text-slate-500 hover:bg-slate-100 rounded-xl font-bold transition-all"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-10 py-3 bg-brand text-white hover:brightness-110 rounded-xl font-bold shadow-xl shadow-brand/20 transition-all flex items-center gap-2"
                    >
                        <Save className="w-5 h-5" /> {t('save')}
                    </button>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm gap-4 transition-colors">
                <div className="relative w-full md:w-96 group">
                    <Search className="w-4 h-4 absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-brand transition-colors" />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-12 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand w-full bg-slate-50 dark:bg-slate-800 dark:text-white focus:bg-white transition-all shadow-inner"
                    />
                </div>
                <button
                    onClick={handleAdd}
                    className="w-full md:w-auto bg-brand hover:brightness-110 text-white px-6 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-xl shadow-brand/20 transition-all"
                >
                    <Plus className="w-5 h-5" /> Add Product
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[700px]">
                        <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                            <tr>
                                <th className="px-8 py-5 cursor-pointer hover:text-brand transition-colors" onClick={() => toggleSort('sku')}>
                                    <div className="flex items-center gap-2">SKU <ArrowUpDown className="w-3 h-3" /></div>
                                </th>
                                <th className="px-8 py-5 cursor-pointer hover:text-brand transition-colors" onClick={() => toggleSort('name')}>
                                    <div className="flex items-center gap-2">Name <ArrowUpDown className="w-3 h-3" /></div>
                                </th>
                                <th className="px-8 py-5 cursor-pointer hover:text-brand transition-colors" onClick={() => toggleSort('unitPrice')}>
                                    <div className="flex items-center gap-2">Price <ArrowUpDown className="w-3 h-3" /></div>
                                </th>
                                <th className="px-8 py-5">Value</th>
                                <th className="px-8 py-5 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            <AnimatePresence mode="popLayout">
                                {filteredAndSortedProducts.map((product) => (
                                    <motion.tr
                                        layout
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        key={product.id}
                                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group"
                                    >
                                        <td className="px-8 py-5">
                                            <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200">
                                                {product.sku || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="font-bold text-slate-900 dark:text-white">{product.name}</div>
                                            <div className="text-xs text-slate-500 line-clamp-1">{product.description}</div>
                                        </td>
                                        <td className="px-8 py-5 text-slate-600 dark:text-slate-400 font-mono">
                                            {product.unitPrice.toFixed(2)} € / {formatUnit(product.unit)}
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                {(product.unitPrice * (1 + product.vatRate / 100)).toFixed(2)} € <span className="text-[10px] text-slate-400 uppercase">inc. VAT</span>
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEdit(product)} className="p-2.5 text-brand hover:bg-brand/10 rounded-xl transition-colors">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => onDelete(product.id)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>

            {filteredAndSortedProducts.length === 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-20 text-center border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                    <Box className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold">No products found in your library.</p>
                </div>
            )}
        </div>
    );
};

export default ProductManager;
