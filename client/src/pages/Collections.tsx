import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import { ArrowRight } from "lucide-react";

export default function Collections() {
  useSEO({
    title: "Universos — Isekai World",
    description: "Explora todas nuestras colecciones de figuras 3D de anime y gaming.",
    url: "https://isekaiworld.co/collections",
  });

  const { data: categories = [] } = trpc.categories.list.useQuery();

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <div className="border-b border-[#f0f0f0] py-12 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs tracking-widest uppercase text-[#e5007d] mb-2">Isekai World</p>
          <h1 className="text-4xl lg:text-6xl font-black text-[#111]">Universos</h1>
          <p className="text-[#999] mt-2">Explora todos nuestros universos</p>
        </div>
      </div>

      {/* Grid — mismo estilo que mega menú */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {categories.map((cat: any) => (
            <Link
              key={cat.id}
              href={`/catalog?category=${cat.slug}`}
              className="group relative flex flex-col overflow-hidden rounded-2xl shadow-sm bg-white"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={cat.imageUrl}
                  alt={cat.name}
                  width={400}
                  height={300}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="px-4 py-3 flex items-start justify-between gap-2 text-[#1a1a1a]">
                <div>
                  <div className="font-bold text-[13px] leading-tight">{cat.name}</div>
                  {cat.description && (
                    <div className="text-[11px] mt-0.5 leading-snug text-[#888]">{cat.description}</div>
                  )}
                </div>
                <ArrowRight size={14} className="shrink-0 mt-0.5 transition-transform duration-200 group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
