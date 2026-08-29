import { useState } from 'react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useSEO } from '@/hooks/useSEO';
import { Calendar, Eye } from 'lucide-react';

export default function Blog() {
  const [selectedCategory, setSelectedCategory] = useState('');

  useSEO({
    title: 'Blog — Noticias, tutoriales y cosplay | Isekai World',
    description: 'Artículos sobre impresión 3D, cosplay, anime y gaming. Tutoriales, noticias y más de Isekai World.',
    url: 'https://isekaiworld.co/blog',
  });

  const { data: posts = [] } = trpc.blog.getPosts.useQuery({
    status: 'published',
    category: selectedCategory || undefined,
  });
  const { data: categories = [] } = trpc.blog.getCategories.useQuery();

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hero */}
      <div className="border-b border-white/[0.08] py-16 px-6 lg:px-16">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs tracking-widest uppercase text-[#e5007d] mb-3">Isekai World</p>
          <h1 className="text-5xl lg:text-7xl font-black text-white mb-4">Blog</h1>
          <p className="text-[#888] text-lg max-w-xl">
            Tutoriales, noticias, cosplay y todo sobre el universo de la impresión 3D.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 lg:px-16 py-12">
        {/* Categorías */}
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-10">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                !selectedCategory ? 'bg-[#e5007d] text-white' : 'bg-[#16191f] text-[#888] border border-white/10 hover:border-[#e5007d]'
              }`}
            >
              Todos
            </button>
            {(categories as any[]).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  selectedCategory === cat.slug ? 'bg-[#e5007d] text-white' : 'bg-[#16191f] text-[#888] border border-white/10 hover:border-[#e5007d]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Grid de artículos */}
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#555] text-lg">No hay artículos publicados aún.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(posts as any[]).map((post, i) => (
              <Link key={post.id} href={`/blog/${post.slug}`}>
                <article className={`group bg-[#16191f] border border-white/10 rounded-2xl overflow-hidden hover:border-[#e5007d] transition-all cursor-pointer ${
                  i === 0 ? 'md:col-span-2' : ''
                }`}>
                  {post.coverImage && (
                    <div className={`overflow-hidden ${i === 0 ? 'h-64' : 'h-48'}`}>
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    {post.category && (
                      <span className="text-xs font-bold text-[#e5007d] uppercase tracking-widest mb-2 block">
                        {post.category}
                      </span>
                    )}
                    <h2 className={`font-black text-white mb-2 group-hover:text-[#e5007d] transition-colors leading-tight ${
                      i === 0 ? 'text-2xl' : 'text-lg'
                    }`}>
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-[#888] text-sm leading-relaxed mb-4 line-clamp-2">{post.excerpt}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-[#555]">
                      {post.publishedAt && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(post.publishedAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Eye size={12} />
                        {post.views ?? 0} vistas
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
