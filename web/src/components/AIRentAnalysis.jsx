import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api/client';

export default function AIRentAnalysis({ property }) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const runAnalysis = useMutation({
    mutationFn: () => api.post('/api/ai/rent-analysis', {
      property_id: property.id
    }),
    onSuccess: (data) => {
      setAnalysis(data.analysis);
    }
  });

  const getPriceRecommendation = (current, recommended) => {
    const diff = recommended - current;
    const percent = ((diff / current) * 100).toFixed(1);
    
    if (diff > 0) {
      return {
        text: `+${percent}% (${diff > 0 ? '+' : ''}$${diff.toFixed(0)}/month)`,
        color: 'text-green-600',
        bg: 'bg-green-100 dark:bg-green-900/20',
        message: `You could earn an extra $${(diff * 12).toFixed(0)}/year!`
      };
    } else if (diff < 0) {
      return {
        text: `${percent}% ($${diff.toFixed(0)}/month)`,
        color: 'text-orange-600',
        bg: 'bg-orange-100 dark:bg-orange-900/20',
        message: 'Your rent is above market rate'
      };
    }
    return {
      text: 'At market rate',
      color: 'text-blue-600',
      bg: 'bg-blue-100 dark:bg-blue-900/20',
      message: 'Your rent is competitive'
    };
  };

  const handleAnalyze = () => {
    setShowAnalysis(true);
    runAnalysis.mutate();
  };

  const recommendation = analysis ? getPriceRecommendation(property.monthly_rent || analysis.current_rent, analysis.recommended_rent) : null;

  return (
    <>
      <button
        onClick={handleAnalyze}
        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 flex items-center gap-2"
      >
        🤖 AI Rent Analysis
      </button>

      {showAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">🤖 AI Rent Price Analysis</h3>
                <button 
                  onClick={() => {setShowAnalysis(false); setAnalysis(null);}}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {runAnalysis.isPending ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-4">🔍</div>
                  <p className="text-gray-600 dark:text-gray-400">Analyzing market data...</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Comparing similar properties in your area</p>
                </div>
              ) : analysis ? (
                <div className="space-y-6">
                  {/* Current vs Recommended */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current Rent</div>
                      <div className="text-2xl font-bold">${property.monthly_rent || analysis.current_rent}</div>
                    </div>
                    <div className={`p-4 rounded-lg ${recommendation.bg}`}>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">AI Recommended</div>
                      <div className={`text-2xl font-bold ${recommendation.color}`}>
                        ${analysis.recommended_rent}
                        <span className="text-sm ml-2">{recommendation.text}</span>
                      </div>
                    </div>
                  </div>

                  {recommendation.message && (
                    <div className={`p-4 rounded-lg ${recommendation.bg} ${recommendation.color}`}>
                      <div className="font-bold">💡 {recommendation.message}</div>
                    </div>
                  )}

                  {/* Analysis Details */}
                  <div>
                    <h4 className="font-bold mb-3">📊 Market Analysis</h4>
                    <div className="space-y-2 text-sm">
                      {analysis.factors && analysis.factors.map((factor, idx) => (
                        <div key={idx} className="flex justify-between py-2 border-b dark:border-gray-700">
                          <span>{factor.factor}</span>
                          <span className={`font-semibold ${factor.impact > 0 ? 'text-green-600' : factor.impact < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                            {factor.impact > 0 ? '+' : ''}{factor.impact}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Comparable Properties */}
                  {analysis.comparables && analysis.comparables.length > 0 && (
                    <div>
                      <h4 className="font-bold mb-3">🏘️ Comparable Properties</h4>
                      <div className="space-y-2">
                        {analysis.comparables.map((comp, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                            <div>
                              <div className="font-medium">{comp.address}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {comp.bed} bed • {comp.bath} bath • {comp.sqft} sqft
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">${comp.rent}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                ${comp.price_per_sqft}/sqft
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700">
                      📈 Update Rent Price
                    </button>
                    <button 
                      onClick={() => {setShowAnalysis(false); setAnalysis(null);}}
                      className="flex-1 bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
                    >
                      Close
                    </button>
                  </div>

                  <p className="text-xs text-gray-400 text-center mt-2">
                    Analysis powered by AI • Market data updated daily
                  </p>
                </div>
              ) : (
                <div className="text-center py-10 text-red-600">
                  <p>Failed to load analysis. Please try again.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
