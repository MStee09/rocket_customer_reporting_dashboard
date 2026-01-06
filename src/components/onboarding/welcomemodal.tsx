import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles, ArrowRight } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WELCOME_STORAGE_KEY = 'rocket-welcome-shown';

export function useWelcomeModal() {
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem(WELCOME_STORAGE_KEY);
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    }
  }, []);

  const dismissWelcome = () => {
    localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
    setShowWelcome(false);
  };

  // New: Allow replaying the tour
  const replayTour = () => {
    localStorage.removeItem(WELCOME_STORAGE_KEY);
    setShowWelcome(true);
  };

  return { showWelcome, dismissWelcome, replayTour };
}

// Export for use in HowToPage
export function resetWelcomeTour() {
  localStorage.removeItem(WELCOME_STORAGE_KEY);
}

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleShowDataOverview = () => {
    // Close modal and navigate to AI Studio with a pre-filled query
    onClose();
    navigate('/ai-studio?query=' + encodeURIComponent('Give me an overview of my shipping data - what are the key trends and insights I should know about?'));
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleSkip}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-charcoal-800 to-charcoal-700 px-6 py-8 text-center">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <img
              src="/logo-with_words copy.png"
              alt="Rocket"
              className="w-10 h-10 object-contain"
            />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome to Rocket Shipping
          </h2>
          <p className="text-charcoal-300">
            Let's see what's happening with your shipments.
          </p>
        </div>

        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content - Task-focused, not feature list */}
        <div className="p-6">
          <div className="bg-gradient-to-r from-rocket-50 to-orange-50 rounded-xl p-5 mb-6 border border-rocket-100">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-rocket-500 to-rocket-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-rocket-500/25">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Get instant insights with AI
                </h3>
                <p className="text-sm text-gray-600">
                  Our AI can analyze your shipping data and show you key trends, costs, and opportunities in seconds.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleShowDataOverview}
            className="w-full py-4 bg-gradient-to-r from-rocket-600 to-rocket-500 text-white font-semibold rounded-xl hover:from-rocket-700 hover:to-rocket-600 transition-all shadow-lg shadow-rocket-500/25 flex items-center justify-center gap-2 group"
          >
            <Sparkles className="w-5 h-5" />
            Show Me My Data Overview
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={handleSkip}
            className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Skip for now — I'll explore on my own
          </button>

          <p className="text-xs text-center text-gray-400 mt-4">
            You can replay this tour anytime from Help & Docs
          </p>
        </div>
      </div>
    </div>
  );
}
