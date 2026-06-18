import { cn } from "@/lib/utils";
import { resolveMediaUrl } from "@/shared/api/media";

interface ProfileAvatarProps {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  textClassName?: string;
}

function getInitials(name: string): string {
  const first = name.trim()[0];
  return first ? first.toUpperCase() : "U";
}

export function ProfileAvatar({
  name,
  avatarUrl,
  className,
  textClassName,
}: ProfileAvatarProps) {
  const avatarSrc = resolveMediaUrl(avatarUrl);

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#18181B] text-sm font-semibold text-[#FAFAFA]",
        className
      )}
    >
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <span className={textClassName}>{getInitials(name)}</span>
      )}
    </div>
  );
}
