"use client";
import React, { useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { Music2 } from "lucide-react";
import { PlaybackContextValue } from "../../hooks/usePlaybackManager";
import { SettingsMenuButton } from "./SettingsMenuButton";

interface AudioTracksMenuProps {
  manager: PlaybackContextValue;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AudioTracksMenu: React.FC<AudioTracksMenuProps> = ({
  manager,
  open,
  onOpenChange,
}) => {
  const { playbackState } = manager;
  const { currentMediaSource } = playbackState;

  const audioTracks = useMemo(() => {
    const streams =
      currentMediaSource?.MediaStreams?.filter((s) => s.Type === "Audio") ?? [];

    const tracks = streams.map((stream) => ({
      id: stream.Index,
      label:
        stream.DisplayTitle ||
        stream.Language ||
        `${stream.Codec || "Audio"} Track ${stream.Index}`,
      language: stream.Language || "unknown",
      codec: stream.Codec,
      channels: stream.Channels,
      default: stream.IsDefault || false,
    }));

    tracks.sort((a, b) => {
      if (a.default && !b.default) return -1;
      if (!a.default && b.default) return 1;
      return (a.language || "").localeCompare(b.language || "");
    });

    return tracks;
  }, [currentMediaSource]);

  const handleAudioChange = (indexStr: string) => {
    const index = parseInt(indexStr);
    if (!isNaN(index)) {
      manager.setAudioStreamIndex(index);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <SettingsMenuButton icon={Music2} isOpen={open} title="Audio" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-48 rounded-2xl overflow-hidden text-sm z-100 max-h-[60vh] overflow-y-auto"
        style={{
          background: "rgba(30, 30, 30, 0.65)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        }}
      >
        <DropdownMenuRadioGroup
          value={String(playbackState.audioStreamIndex || "")}
          onValueChange={handleAudioChange}
        >
          {audioTracks.map((track) => (
            <DropdownMenuRadioItem
              key={track.id ?? track.label}
              value={String(track.id)}
              className="px-5 py-2.5 transition-colors hover:bg-white/10 text-white"
            >
              <span className="text-white/90 ml-3">{track.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
