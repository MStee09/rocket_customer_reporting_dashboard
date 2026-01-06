import { useState, useEffect } from 'react';
import { X, Sparkles, BarChart3, FileText, Truck } from 'lucide-react';

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

  return { showWelcome, dismissWelcome };
}

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  if (!isOpen) return null;

  const features = [
    {
      icon: Sparkles,
      title: 'Ask AI',
      description: 'Get instant answers about your shipping data using natural language',
    },
    {
      icon: BarChart3,
      title: 'Analytics Hub',
      description: 'Explore your data with interactive charts and insights',
    },
    {
      icon: FileText,
      title: 'Reports',
      description: 'Build custom reports and schedule automated delivery',
    },
    {
      icon: Truck,
      title: 'Shipments',
      description: 'Track all your shipments in real-time',
    },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
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
            Your AI-powered logistics intelligence platform
          </p>
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Quick Tour
          </h3>

          <div className="space-y-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="w-10 h-10 bg-rocket-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-5 h-5 text-rocket-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{feature.title}</h4>
                  <p className="text-sm text-gray-500">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <button
              onClick={onClose}
              className="w-full py-3 bg-rocket-600 text-white font-semibold rounded-xl hover:bg-rocket-700 transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
