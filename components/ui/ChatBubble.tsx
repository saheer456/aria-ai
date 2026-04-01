'use client';

import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  timestamp?: string;
}

export function ChatBubble({ role, content, model, timestamp }: ChatBubbleProps) {
  const isUser = role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`flex gap-3 mb-6 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-[var(--aria-pastel-purple)] flex items-center justify-center text-[11px] font-bold text-slate-700 shrink-0 mt-0.5">
          A
        </div>
      )}

      <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'} max-w-[82%]`}>
        <div className={isUser ? 'bubble-user px-4 py-2.5' : 'bubble-ai px-4 py-3 w-full'}>
          {isUser ? (
            // User: plain text
            <p className="text-[15px] text-slate-900 leading-relaxed whitespace-pre-wrap break-words">{content}</p>
          ) : (
            // AI: rich markdown
            <div className="ai-prose text-[15px] leading-relaxed text-slate-900">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Headings
                  h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2 first:mt-0">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-semibold mt-3 mb-1.5 first:mt-0">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-semibold mt-2 mb-1 first:mt-0">{children}</h3>,
                  // Paragraphs
                  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                  // Lists
                  ul: ({ children }) => <ul className="list-disc list-outside ml-4 mb-2 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-outside ml-4 mb-2 space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  // Inline code and block code
                  code: ({ children, className }) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = !match;
                    
                    if (!isInline) {
                      return (
                        <CodeBlock 
                          language={match[1]} 
                          value={String(children).replace(/\n$/, '')} 
                        />
                      );
                    }
                    
                    return (
                      <code className="bg-black/5 text-slate-800 rounded-md px-1.5 py-0.5 text-[13px] font-mono font-medium">
                        {children}
                      </code>
                    );
                  },
                  // Code block wrapper
                  pre: ({ children }) => <pre className="my-2 overflow-x-auto">{children}</pre>,
                  // Blockquote
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-slate-200 pl-4 py-1 my-4 italic text-slate-500 bg-slate-50/50 rounded-r-lg">
                      {children}
                    </blockquote>
                  ),
                  // Links
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline underline-offset-2 hover:text-blue-800">
                      {children}
                    </a>
                  ),
                  // Strong / em
                  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  // Horizontal rule
                  hr: () => <hr className="my-3 border-slate-200" />,
                  // Table
                  table: ({ children }) => (
                    <div className="overflow-hidden my-4 border border-slate-200 rounded-xl shadow-sm">
                      <table className="min-w-full text-[13.5px] border-collapse">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-slate-50 border-b border-slate-200 font-semibold">{children}</thead>,
                  th: ({ children }) => <th className="px-4 py-3 text-left font-bold text-slate-700 border-r border-slate-200 last:border-0">{children}</th>,
                  td: ({ children }) => <td className="px-4 py-3 border-b border-r border-slate-100 last:border-r-0 last:border-b-0 hover:bg-slate-50/50 transition-colors">{children}</td>,
                  tr: ({ children }) => <tr className="last:border-0">{children}</tr>,
                  // Images — renders DeepAI generated images
                  img: ({ src, alt }) => {
                    const imgSrc = typeof src === 'string' ? src : undefined;
                    return (
                      <div className="my-3 flex flex-col gap-2">
                        <img
                          src={imgSrc}
                          alt={alt || 'Generated image'}
                          className="rounded-2xl max-w-full shadow-md border border-black/5 w-full"
                          style={{ maxHeight: '480px', objectFit: 'contain' }}
                        />
                        {imgSrc && (
                          <a
                            href={imgSrc}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="self-start text-[12px] font-medium text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            ↓ Open full image
                          </a>
                        )}
                      </div>
                    );
                  },
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Meta row */}
        <div className={`flex items-center gap-2 px-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          {timestamp && (
            <span className="text-[11px] text-slate-400">
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {!isUser && model && (
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{model}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
