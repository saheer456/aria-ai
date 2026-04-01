'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Sparkles } from 'lucide-react';

interface RatingButtonsProps {
  memoryIds?: string[];
  messageId?: string;
  onRated?: (rating: 1 | -1) => void;
}

export function RatingButtons({ memoryIds, messageId, onRated }: RatingButtonsProps) {
  const [rated, setRated] = useState<1 | -1 | null>(null);
  const [loading, setLoading] = useState(false);
  const [showMemoryBadge, setShowMemoryBadge] = useState(
    () => memoryIds && memoryIds.length > 0
  );

  const handleRate = async (rating: 1 | -1) => {
    if (rated || loading) return;
    setLoading(true);

    try {
      if (memoryIds && memoryIds.length > 0) {
        // Rate all associated memories
        await Promise.all(
          memoryIds.map(id =>
            fetch('/api/rag/rate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ memoryId: id, rating }),
            })
          )
        );
      }

      setRated(rating);
      onRated?.(rating);
    } catch (err) {
      console.error('[RatingButtons] Error rating memory:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      {/* Memory badge — shows when RAG context was used */}
      <AnimatePresence>
        {showMemoryBadge && memoryIds && memoryIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 border border-violet-100 text-violet-600"
            title={`${memoryIds.length} memory chunk(s) used to generate this response`}
          >
            <Sparkles size={10} strokeWidth={2} />
            <span className="text-[10px] font-semibold">
              {memoryIds.length} memor{memoryIds.length === 1 ? 'y' : 'ies'} used
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rating buttons */}
      <div className="flex items-center gap-1">
        <AnimatePresence mode="wait">
          {rated ? (
            <motion.span
              key="rated"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                rated === 1
                  ? 'bg-green-50 text-green-600 border border-green-100'
                  : 'bg-red-50 text-red-500 border border-red-100'
              }`}
            >
              {rated === 1 ? 'Thanks! Memory updated ✓' : 'Got it, memory downgraded'}
            </motion.span>
          ) : (
            <motion.div
              key="buttons"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1"
            >
              <button
                id={`rate-up-${messageId}`}
                onClick={() => handleRate(1)}
                disabled={loading}
                title="Good response — boost related memories"
                className="p-1.5 rounded-lg text-slate-400 hover:text-green-500 hover:bg-green-50 transition-colors disabled:opacity-40"
              >
                <ThumbsUp size={13} strokeWidth={1.8} />
              </button>
              <button
                id={`rate-down-${messageId}`}
                onClick={() => handleRate(-1)}
                disabled={loading}
                title="Bad response — downgrade related memories"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
              >
                <ThumbsDown size={13} strokeWidth={1.8} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
