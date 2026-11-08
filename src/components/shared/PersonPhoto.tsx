"use client";
// A person's professional photo (team page, their own site or GitHub; never LinkedIn),
// falling back to their initials when there's none or it fails to load.
import { useState } from "react";

export function PersonPhoto({ url, fallback }: { url: string | null | undefined; fallback: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) return <>{fallback}</>;
  return (
    // Photos come from many different hosts, so next/image would need every domain configured.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="size-full object-cover"
    />
  );
}
