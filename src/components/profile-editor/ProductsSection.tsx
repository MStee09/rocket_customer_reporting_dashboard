import { useState } from 'react';
import { Plus, X, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { addProduct, removeProduct } from '../../services/customerIntelligenceService';
import type { CustomerIntelligenceProfile, ProductMapping } from '../../types/customerIntelligence';

interface ProductsSectionProps {
  customerId: number;
  products: ProductMapping[];
  onUpdate: (profile: CustomerIntelligenceProfile) => void;
}

export function ProductsSection({ customerId, products, onUpdate }: ProductsSectionProps) {
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    searchField: 'commodity_description',
    keywords: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!user || !newProduct.name.trim() || !newProduct.keywords.trim()) return;

    setIsSaving(true);
    try {
      const keywordsArray = newProduct.keywords.split(',').map((k) => k.trim()).filter(Boolean);
      const updated = await addProduct(
        customerId,
        {
          name: newProduct.name.trim(),
          searchField: newProduct.searchField,
          keywords: keywordsArray,
          validated: false,
          matchCount: 0,
          matchPercent: 0,
          sampleMatches: [],
          validatedAt: new Date().toISOString(),
          isSoftKnowledge: true,
        },
        user.id,
        user.email || 'unknown'
      );
      onUpdate(updated);
      setNewProduct({ name: '', searchField: 'commodity_description', keywords: '' });
      setIsAdding(false);
    } catch (err) {
      console.error('Error adding product:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (productId: string) => {
    if (!user) return;

    setRemovingId(productId);
    try {
      const updated = await removeProduct(customerId, productId, user.id, user.email || 'unknown');
      onUpdate(updated);
    } catch (err) {
      console.error('Error removing product:', err);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {products.length === 0 && !isAdding ? (
        <p className="text-sm text-gray-500 italic">No products defined yet.</p>
      ) : (
        <div className="space-y-2">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {product.validated ? (
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{product.name}</span>
                    {product.matchPercent > 0 && (
                      <span className="text-xs text-gray-500">({product.matchPercent}% match)</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {product.searchField}: {product.keywords.join(', ')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleRemove(product.id)}
                disabled={removingId === product.id}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 flex-shrink-0 ml-2"
              >
                {removingId === product.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {isAdding ? (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
              <input
                type="text"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                placeholder="e.g., Electronics"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Field</label>
              <select
                value={newProduct.searchField}
                onChange={(e) => setNewProduct({ ...newProduct, searchField: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="commodity_description">Commodity Description</option>
                <option value="description">Description</option>
                <option value="reference_number">Reference Number</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Keywords (comma-separated)</label>
            <input
              type="text"
              value={newProduct.keywords}
              onChange={(e) => setNewProduct({ ...newProduct, keywords: e.target.value })}
              placeholder="e.g., laptop, computer, tablet"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleAdd}
              disabled={isSaving || !newProduct.name.trim() || !newProduct.keywords.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Product
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewProduct({ name: '', searchField: 'commodity_description', keywords: '' });
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      )}
    </div>
  );
}

export default ProductsSection;
