import React, { useState, useEffect } from "react";

interface SubtitleLine {
  startTime: number; // in seconds
  endTime: number;
  text: string;
}

interface SubtitleTrack {
  index: number;
  label: string;
  src: string;
  language?: string;
  kind?: string;
}

interface SubtitleDisplayProps {
  currentTime: number;
  subtitleStreamIndex?: number;
  textTracks?: SubtitleTrack[];
  isVisible?: boolean;
  isControlsVisible?: boolean;
}

/**
 * Parse HTML tags in subtitle text and convert to React elements with proper nesting
 */
function parseSubtitleHTML(text: string): React.ReactNode {
  const htmlRegex = /<(\/?)([a-zA-Z0-9-]+)[^>]*>/gi;
  const segments: (
    | React.ReactNode
    | { tag: string; isClosing: boolean; attributes: string }
  )[] = [];
  let lastIndex = 0;

  let match;
  while ((match = htmlRegex.exec(text)) !== null) {
    // Add text before this tag
    if (match.index > lastIndex) {
      segments.push(text.substring(lastIndex, match.index));
    }

    // Add tag marker
    segments.push({
      tag: match[2].toLowerCase(),
      isClosing: match[1] === "/",
      attributes: match[0],
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push(text.substring(lastIndex));
  }

  // Recursively build React elements from segments
  function buildElements(
    items: any[],
    startIdx = 0,
  ): { elements: React.ReactNode[]; endIdx: number } {
    const elements: React.ReactNode[] = [];
    let idx = startIdx;

    while (idx < items.length) {
      const item = items[idx];

      // If it's text, just add it
      if (typeof item === "string") {
        elements.push(item);
        idx++;
      }
      // If it's a tag
      else if (item.tag) {
        if (item.isClosing) {
          // Return to parent level
          return { elements, endIdx: idx };
        } else {
          // Open tag - recursively parse children
          const { elements: childElements, endIdx: nextIdx } = buildElements(
            items,
            idx + 1,
          );

          // Create the appropriate element based on tag
          let element: React.ReactNode = <>{childElements}</>;

          switch (item.tag) {
            case "i":
              element = <i key={`i-${idx}`}>{childElements}</i>;
              break;
            case "b":
              element = <b key={`b-${idx}`}>{childElements}</b>;
              break;
            case "u":
              element = <u key={`u-${idx}`}>{childElements}</u>;
              break;
            case "s":
              element = <s key={`s-${idx}`}>{childElements}</s>;
              break;
            case "font":
              const style: React.CSSProperties = {};
              const colorMatch = item.attributes?.match(
                /color=(?:"([^"]+)"|'([^']+)'|([^>\s]+))/i,
              );
              if (colorMatch)
                style.color = colorMatch[1] || colorMatch[2] || colorMatch[3];

              const faceMatch = item.attributes?.match(
                /face=(?:"([^"]+)"|'([^']+)'|([^>\s]+))/i,
              );
              if (faceMatch)
                style.fontFamily = faceMatch[1] || faceMatch[2] || faceMatch[3];

              element = (
                <span key={`span-${idx}`} style={style}>
                  {childElements}
                </span>
              );
              break;
            default:
              element = <span key={`span-${idx}`}>{childElements}</span>;
          }

          elements.push(element);
          idx = nextIdx + 1; // Skip the closing tag
        }
      } else {
        idx++;
      }
    }

    return { elements, endIdx: items.length };
  }

  const { elements } = buildElements(segments);
  return elements;
}

export const SubtitleDisplay: React.FC<SubtitleDisplayProps> = ({
  currentTime,
  subtitleStreamIndex,
  textTracks: _textTracks, // Keep prop for compatibility, but we use TextTrack API
  isVisible = true,
  isControlsVisible = true,
}) => {
  const [currentSubtitle, setCurrentSubtitle] = useState<SubtitleLine | null>(
    null,
  );
  const [subtitleSize, setSubtitleSize] = useState<number>(100);

  // Load subtitle size from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aperture-subtitle-size");
      if (saved) {
        setSubtitleSize(parseInt(saved, 10));
      }
    }
  }, []);

  // Listen for storage changes (subtitle size updates)
  useEffect(() => {
    const handleStorageChange = () => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("aperture-subtitle-size");
        if (saved) {
          setSubtitleSize(parseInt(saved, 10));
        }
      }
    };

    const handleSubtitleSizeEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.size) {
        setSubtitleSize(customEvent.detail.size);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("subtitle-size-change", handleSubtitleSizeEvent);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "subtitle-size-change",
        handleSubtitleSizeEvent,
      );
    };
  }, []);

  // Read subtitle cues from the video element's native TextTrack API.
  // HLS.js adds <track> elements and pushes VTTCue objects into them.
  // We listen for cuechange instead of polling currentTime.
  useEffect(() => {
    const video = document.getElementById(
      "aperture-video-player",
    ) as HTMLVideoElement | null;
    if (!video) return;

    const findActiveCue = () => {
      for (let i = 0; i < video.textTracks.length; i++) {
        const track = video.textTracks[i];
        if (
          track.mode !== "disabled" &&
          track.activeCues &&
          track.activeCues.length > 0
        ) {
          const cue = track.activeCues[0] as VTTCue;
          setCurrentSubtitle({
            startTime: cue.startTime,
            endTime: cue.endTime,
            text: cue.text,
          });
          return;
        }
      }
      setCurrentSubtitle(null);
    };

    const handleCueChange = () => findActiveCue();

    // Attach cuechange listeners to existing tracks
    const attachToTracks = () => {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].addEventListener("cuechange", handleCueChange);
      }
    };

    // Listen for tracks added later (HLS.js adds them asynchronously)
    const handleAddTrack = () => {
      const added = video.textTracks[video.textTracks.length - 1];
      if (added) {
        added.addEventListener("cuechange", handleCueChange);
      }
      // Do an initial cue check after a track is added
      findActiveCue();
    };

    video.textTracks.addEventListener("addtrack", handleAddTrack);
    attachToTracks();
    findActiveCue();

    return () => {
      video.textTracks.removeEventListener("addtrack", handleAddTrack);
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].removeEventListener("cuechange", handleCueChange);
      }
    };
  }, [subtitleStreamIndex]);

  if (!isVisible || !currentSubtitle) {
    return null;
  }

  return (
    <div
      className="absolute left-0 right-0 flex justify-center pointer-events-none transition-all duration-300"
      style={{
        bottom: isControlsVisible ? "176px" : "112px",
        zIndex: 40,
      }}
    >
      <div
        style={{
          maxWidth: "95%",
          textAlign: "center",
        }}
      >
        <div
          className="text-white leading-relaxed whitespace-pre-wrap"
          style={{
            fontSize: `${20 * (subtitleSize / 100)}px`,
            fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
            fontWeight: 400,
            textShadow:
              "2px 2px 4px rgba(0, 0, 0, 1), -2px -2px 4px rgba(0, 0, 0, 1), 2px -2px 4px rgba(0, 0, 0, 1), -2px 2px 4px rgba(0, 0, 0, 1)",
            letterSpacing: "0.5px",
            lineHeight: "1.4",
          }}
        >
          {parseSubtitleHTML(currentSubtitle.text)}
        </div>
      </div>
    </div>
  );
};
