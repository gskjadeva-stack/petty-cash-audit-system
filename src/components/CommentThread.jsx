import { useState } from 'react';
import { db } from '@/api/client';

import { format } from 'date-fns';
import { Send, MessageSquare } from 'lucide-react';

export default function CommentThread({ recordId, comments, user, onRefresh }) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const post = async () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    await db.entities.Comment.create({
      pca_record_id: recordId,
      content: content.trim(),
      author_name: user?.full_name || 'User',
      author_role: user?.role || 'auditor',
    });
    await db.entities.ActivityLog.create({
      pca_record_id: recordId,
      action_type: 'Comment Added',
      description: `Comment posted by ${user?.full_name || 'User'}`,
      actor_name: user?.full_name || 'User',
      actor_role: user?.role || '',
    });
    setContent('');
    setSubmitting(false);
    onRefresh();
  };

  const initials = (name) => name?.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2) || 'U';

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        {comments.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare size={26} className="mx-auto text-slate-200 mb-2" />
            <p className="text-sm text-slate-400">No comments yet. Start the discussion.</p>
          </div>
        )}
        {comments.map(c => (
          <div key={c.id} className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: '#1E3A5F' }}>
              {initials(c.author_name)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-slate-800">{c.author_name}</span>
                {c.author_role && <span className="px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-500 rounded capitalize font-medium">{c.author_role}</span>}
                <span className="text-xs text-slate-400 ml-auto">
                  {c.created_date ? format(new Date(c.created_date), 'MMM d, yyyy · HH:mm') : ''}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm text-slate-700 leading-relaxed">
                {c.content}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-3 border-t border-slate-100 flex gap-3">
        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: '#1E3A5F' }}>
          {initials(user?.full_name)}
        </div>
        <div className="flex-1 flex gap-2">
          <textarea
            className="flex-1 border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] transition-all"
            rows={2}
            placeholder="Add a comment… (Ctrl+Enter to submit)"
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) post(); }}
          />
          <button
            onClick={post}
            disabled={submitting || !content.trim()}
            className="self-end px-3 py-2.5 rounded-xl text-white disabled:opacity-40 transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1E3A5F' }}>
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}