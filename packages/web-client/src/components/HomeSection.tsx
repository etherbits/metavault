import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { MediaCard, type MediaItem } from "./MediaCard";

interface HomeSectionProps {
  title: string;
  count: number;
  items: MediaItem[];
  onQueryMore?: () => void;
  loading?: boolean;
  defaultOpen?: boolean;
}

export function HomeSection({
  title,
  count,
  items,
  onQueryMore,
  loading = false,
  defaultOpen = true,
}: HomeSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="flex flex-col gap-6 w-full">
      {/* SECTION HEADER */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          padding: "0px",
          gap: "48px",
          width: "100%",
        }}
      >
        {/* LEFT: title + count */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            padding: "0px",
            gap: "12px",
          }}
        >
          <h2
            style={{
              fontFamily: "Geist, sans-serif",
              fontWeight: 500,
              fontSize: "24px",
              lineHeight: "29px",
              letterSpacing: "-1px",
              color: "#D4D4D8",
              margin: 0,
            }}
          >
            {title}
          </h2>
          <span
            style={{
              fontFamily: "Geist, sans-serif",
              fontWeight: 400,
              fontSize: "16px",
              lineHeight: "24px",
              color: "#A1A1AA",
            }}
          >
            {count} {count === 1 ? "Entry" : "Entries"}
          </span>
        </div>

        {/* RIGHT: Query More + collapse */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            padding: "0px",
            gap: "12px",
          }}
        >
          {onQueryMore && (
            <button
              type="button"
              onClick={onQueryMore}
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                padding: "8px 12px",
                gap: "8px",
                width: "101px",
                height: "36px",
                minHeight: "36px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid #3F3F46",
                boxShadow: "0px 1px 2px rgba(0,0,0,0.05)",
                borderRadius: "8px",
                fontFamily: "Geist, sans-serif",
                fontWeight: 500,
                fontSize: "14px",
                lineHeight: "20px",
                color: "#FAFAFA",
                cursor: "pointer",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
              }
            >
              Query More
            </button>
          )}

          <button
            type="button"
            aria-label="Toggle section"
            onClick={() => setIsOpen((p) => !p)}
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              padding: "8px",
              width: "36px",
              minWidth: "36px",
              height: "36px",
              minHeight: "36px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid #3F3F46",
              boxShadow: "0px 1px 2px rgba(0,0,0,0.05)",
              borderRadius: "8px",
              color: "#FAFAFA",
              cursor: "pointer",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
            }
          >
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* SECTION CONTENT */}
      {isOpen && (
        <>
          {loading && (
            <div className="flex justify-center py-10">
              <div
                style={{
                  width: 28,
                  height: 28,
                  border: "2px solid #3F3F46",
                  borderTopColor: "#A1A1AA",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
            </div>
          )}

          {!loading && items.length === 0 && (
            <div
              style={{
                fontFamily: "Geist, sans-serif",
                fontSize: "14px",
                color: "#A1A1AA",
                paddingTop: "32px",
                paddingBottom: "32px",
              }}
            >
              No items found
            </div>
          )}

          {!loading && items.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, 420px)",
                gap: "50px",
                width: "100%",
              }}
            >
              {items.map((item) => (
                <MediaCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
