import { useState } from 'react';
import { Plus, X, Loader2, CheckCircle, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { removeProduct, getProfile } from '../../services/customerIntelligenceService';
import { AddProductModal } from './AddProductModal';
import type { CustomerIntelligenceProfile, ProductMapping } from '../../types/customerIntelligence';

interface ProductsSectionProps {
  customerId: number;
  products: ProductMapping[];
  onUpdate: (profile: CustomerIntelligenceProfile) => void;
}

export function ProductsSection({ customerId, products, onUpdate }: ProductsSectionProps) {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

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
      setConfirmRemoveId(null);
    }
  };

  const handleProductAdded = async () => {
    const profile = await getProfile(customerId);
    if (profile) {
      onUpdate(profile);
    }
  };

  return (
    <div className="space-y-4">
      {products.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No products defined yet.</p>
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="group p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{product.name}</span>
                  </div>

                  {product.isSoftKnowledge ? (
                    <div className="flex items-center gap-1.5 text-sm text-amber-600">
                      <Zap className="w-4 h-4" />
                      <span>Soft knowledge - no database correlation</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {product.validated && (
                        <div className="flex items-center gap-1.5 text-sm text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span>
                            Validated: {product.matchCount.toLocaleString()} shipments (
                            {product.matchPercent}%)
                          </span>
                        </div>
                      )}
                      <p className="text-sm text-gray-500">
                        Searches: <span className="font-medium">{product.searchField}</span> for "
                        {product.keywords.join('", "')}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {confirmRemoveId === product.id ? (
                    <>
                      <span className="text-xs text-gray-500">Remove?</span>
                      <button
                        onClick={() => handleRemove(product.id)}
                        disabled={removingId === product.id}
                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                      >
                        {removingId === product.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          'Yes'
                        )}
                      </button>
                      <button
                        onClick={() => setConfirmRemoveId(null)}
                        className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      >
                        No
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmRemoveId(product.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-rocket-600 hover:bg-rocket-50 rounded-md transition-colors text-sm font-medium"
      >
        <Plus className="w-4 h-4" />
        Add
      </button>

      <AddProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customerId={customerId}
        onProductAdded={handleProductAdded}
      />
    </div>
  );
}

export default ProductsSection;
