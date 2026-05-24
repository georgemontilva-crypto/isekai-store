import { trpc } from "@/lib/trpc";

export default function LinkBio() {
  const { data: items = [] } = trpc.linkBio.list.useQuery();
  const { data: settings } = trpc.settings.getAll.useQuery();

  const storeName    = settings?.["store_name"]           ?? "Isekai World";
  const logoUrl      = settings?.["linkbio_avatar_image"] ?? settings?.["store_logo_url"] ?? "";
  const bannerImage  = settings?.["linkbio_banner_image"] ?? "";
  const bioText      = settings?.["linkbio_bio_text"]    ?? "";
  const bottomImage  = settings?.["linkbio_bottom_image"] ?? "";

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-[480px]">

        {/* Banner */}
        {bannerImage && (
          <div className="w-full h-[180px] rounded-2xl overflow-hidden relative">
            <img src={bannerImage} className="w-full h-full object-cover" alt="" />
          </div>
        )}

        {/* Avatar */}
        <div className={`${bannerImage ? "-mt-10" : ""} mb-4 z-10 relative flex justify-center`}>
          {logoUrl ? (
            <img
              src={logoUrl}
              className="w-20 h-20 rounded-full border-4 border-[#0d0d0d] object-cover"
              alt={storeName}
            />
          ) : (
            <div className="w-20 h-20 rounded-full border-4 border-[#0d0d0d] bg-[#1a1a1a] flex items-center justify-center">
              <span className="text-white text-2xl font-bold">{storeName[0]}</span>
            </div>
          )}
        </div>

        {/* Name */}
        <h1 className="text-white font-bold text-xl mb-1 text-center">{storeName}</h1>

        {/* Bio */}
        <p className="text-[#aaa] text-sm text-center mb-8 min-h-[20px]">{bioText}</p>

        {/* Links */}
        <div className="w-full flex flex-col gap-3">
          {items.map(item => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-white text-[#111] font-semibold text-center py-4 rounded-2xl hover:bg-[#f0f0f0] transition-colors text-sm"
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Bottom image */}
        {bottomImage && (
          <div className="w-full mt-8 rounded-2xl overflow-hidden">
            <img src={bottomImage} className="w-full object-cover" alt="" />
          </div>
        )}

        {/* Footer */}
        <p className="text-[#555] text-xs mt-8 text-center">isekaiworld.co</p>
      </div>
    </div>
  );
}
