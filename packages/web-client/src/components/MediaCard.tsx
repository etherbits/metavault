import { Calendar, Star, MoreHorizontal, Maximize2 } from "lucide-react";

export interface MediaItem {
  id: string;
  title: string;
  type: string;
  status: string;
  date: string;
  rating: string;
  tags: string[];
  posterUrl?: string;
}

export function MediaCard({ item }: { item: MediaItem }) {
  return (
    <div className="flex w-[420px] h-[300px] bg-[#27272A] rounded-[4px] overflow-hidden shadow">
      {/* Poster */}
      <div className="w-[200px] h-[300px] bg-black" />

      {/* Content */}
      <div className="flex flex-col px-4 py-3 gap-4 w-[220px]">
        <h3 className="text-[#F4F4F5] text-[20px] truncate">{item.title}</h3>

        <div className="flex gap-2 flex-wrap">
          <span className="border border-yellow-400 text-yellow-400 text-xs px-2 rounded">
            {item.type}
          </span>
          <span className="border border-blue-400 text-blue-400 text-xs px-2 rounded">
            {item.status}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs bg-[#3F3F46] px-2 rounded flex items-center gap-1 w-fit">
            <Calendar size={12} />
            {item.date}
          </span>

          <span className="text-xs bg-[#3F3F46] px-2 rounded flex items-center gap-1 w-fit">
            <Star size={12} />
            {item.rating}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs border border-[#3F3F46] px-2 rounded"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex justify-end items-center gap-2 mt-auto">
          <button className="w-6 h-6 border border-[#3F3F46] rounded flex items-center justify-center">
            <MoreHorizontal size={14} />
          </button>

          <button className="flex items-center gap-1 bg-[#FACC15] px-3 py-1 rounded text-black text-sm">
            <Maximize2 size={14} />
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}
