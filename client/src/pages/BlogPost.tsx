import { useState } from 'react';
import { useParams, Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useSEO } from '@/hooks/useSEO';
import { Calendar, Eye, ArrowLeft, Tag } from 'lucide-react';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [comment, setComment] = useState({ name: '', email: '', content: '' });
  const [submitted, setSubmitted] = useState(false);

  const { data: post, isLoading } = trpc.blog.getPostBySlug.useQuery(
    { slug: slug ?? '' },
    { enabled: !!slug }
  );
  const { data: comments = [] } = trpc.blog.getComments.useQuery(
    { postId: (post as any)?.id ?? 0 },
    { enabled: !!(post as any)?.id }
  );
  const { data: related = [] } = trpc.blog.getPosts.useQuery(
    { status: 'published', category: (post as any)?.category ?? '', limit: 3 },
    { enabled: !!(post as any)?.category }
  );

  const addComment = trpc.blog.addComment.useMutation({ onSuccess: () => setSubmitted(true) });

  useSEO({
    title: (post as any)?.metaTitle ?? (post as any)?.title ?? 'Artículo | Isekai World',
    description: (post as any)?.metaDescription ?? (post as any)?.excerpt ?? '',
    image: (post as any)?.coverImage,
    url: `https://isekaiworld.co/blog/${slug}`,
    type: 'article',
  });

  if (isLoading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#e5007d] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!post) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <p className="text-white text-2xl font-black mb-4">Artículo no encontrado</p>
        <Link href="/blog" className="text-[#e5007d] underline">Volver al blog</Link>
      </div>
    </div>
  );

  const p = post as any;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hero */}
      {p.coverImage && (
        <div className="relative h-[50vh] overflow-hidden">
          <img src={p.coverImage} alt={p.title} className="w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(13,13,13,1) 0%, rgba(13,13,13,0.3) 60%, transparent 100%)' }} />
        </div>
      )}

      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-12">
        <Link href="/blog" className="flex items-center gap-2 text-[#888] hover:text-white transition-colors text-sm mb-8">
          <ArrowLeft size={16} /> Volver al blog
        </Link>

        {p.category && (
          <span className="text-xs font-bold text-[#e5007d] uppercase tracking-widest mb-4 block">{p.category}</span>
        )}

        <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-6">{p.title}</h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-[#555] mb-8 pb-8 border-b border-white/[0.08]">
          <span className="text-[#888]">Por {p.authorName ?? 'Isekai World'}</span>
          {p.publishedAt && (
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {new Date(p.publishedAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          )}
          <span className="flex items-center gap-1"><Eye size={14} /> {p.views ?? 0} vistas</span>
        </div>

        {p.excerpt && (
          <p className="text-[#aaa] text-xl leading-relaxed mb-8 font-medium italic">{p.excerpt}</p>
        )}

        <div
          className="prose prose-invert prose-lg max-w-none prose-headings:font-black prose-headings:text-white prose-p:text-[#ccc] prose-p:leading-relaxed prose-a:text-[#e5007d] prose-a:no-underline hover:prose-a:underline prose-strong:text-white prose-img:rounded-2xl prose-img:w-full prose-blockquote:border-[#e5007d] prose-blockquote:text-[#888] prose-code:text-[#e5007d] prose-code:bg-[#16191f] prose-code:px-1 prose-code:rounded prose-ul:text-[#ccc] prose-ol:text-[#ccc] prose-hr:border-white/10"
          dangerouslySetInnerHTML={{ __html: p.content ?? '' }}
        />

        {p.tags && (p.tags as string[]).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t border-white/[0.08]">
            <Tag size={14} className="text-[#555] mt-1" />
            {(p.tags as string[]).map((tag: string) => (
              <span key={tag} className="text-xs bg-[#16191f] border border-white/10 text-[#888] px-3 py-1 rounded-full">{tag}</span>
            ))}
          </div>
        )}

        {/* Comentarios */}
        <div className="mt-16">
          <h3 className="text-2xl font-black text-white mb-8">Comentarios ({(comments as any[]).length})</h3>

          {(comments as any[]).length > 0 && (
            <div className="flex flex-col gap-4 mb-10">
              {(comments as any[]).map((c) => (
                <div key={c.id} className="bg-[#16191f] border border-white/10 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-bold text-white text-sm">{c.guestName ?? 'Usuario'}</p>
                    <p className="text-[#555] text-xs">{new Date(c.createdAt).toLocaleDateString('es-VE')}</p>
                  </div>
                  <p className="text-[#ccc] text-sm leading-relaxed">{c.content}</p>
                </div>
              ))}
            </div>
          )}

          {!submitted ? (
            <div className="bg-[#16191f] border border-white/10 rounded-2xl p-6">
              <h4 className="text-white font-bold mb-4">Deja un comentario</h4>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input type="text" placeholder="Tu nombre *" value={comment.name} onChange={e => setComment({ ...comment, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#e5007d] transition-colors" />
                  <input type="email" placeholder="Tu email *" value={comment.email} onChange={e => setComment({ ...comment, email: e.target.value })}
                    className="w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#e5007d] transition-colors" />
                </div>
                <textarea placeholder="Escribe tu comentario..." value={comment.content} onChange={e => setComment({ ...comment, content: e.target.value })} rows={4}
                  className="w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#e5007d] transition-colors resize-none" />
                <button
                  onClick={() => {
                    if (!comment.name || !comment.email || !comment.content) return;
                    addComment.mutate({ postId: p.id, guestName: comment.name, guestEmail: comment.email, content: comment.content });
                  }}
                  disabled={addComment.isPending}
                  className="bg-[#e5007d] text-white py-3 px-8 rounded-xl font-bold hover:bg-[#c4006b] transition-colors self-start disabled:opacity-50"
                >
                  {addComment.isPending ? 'Enviando...' : 'Enviar comentario'}
                </button>
                <p className="text-[#555] text-xs">Los comentarios son revisados antes de publicarse.</p>
              </div>
            </div>
          ) : (
            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 text-center">
              <p className="text-green-400 font-bold">¡Comentario enviado!</p>
              <p className="text-[#888] text-sm mt-1">Será publicado después de revisión.</p>
            </div>
          )}
        </div>

        {/* Artículos relacionados */}
        {(related as any[]).filter(r => r.id !== p.id).length > 0 && (
          <div className="mt-16">
            <h3 className="text-2xl font-black text-white mb-6">Artículos relacionados</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(related as any[]).filter(r => r.id !== p.id).slice(0, 2).map((r) => (
                <Link key={r.id} href={`/blog/${r.slug}`}>
                  <div className="bg-[#16191f] border border-white/10 rounded-2xl overflow-hidden hover:border-[#e5007d] transition-colors cursor-pointer group">
                    {r.coverImage && (
                      <div className="h-36 overflow-hidden">
                        <img src={r.coverImage} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    )}
                    <div className="p-4">
                      <p className="text-white font-bold text-sm group-hover:text-[#e5007d] transition-colors">{r.title}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
