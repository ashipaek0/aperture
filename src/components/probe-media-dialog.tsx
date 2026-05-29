"use client";

import { useState } from "react";
import { probeMedia } from "../actions";
import { MediaSourceInfo } from "../types/jellyfin";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Cpu } from "lucide-react";

interface ProbeMediaDialogProps {
  itemId: string;
  className?: string;
}

function formatBytes(bytes?: number): string {
  if (!bytes) return "—";
  const gb = bytes / 1_073_741_824;
  return gb >= 1 ? `${gb.toFixed(2)} GB` : `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function formatBitrate(bps?: number): string {
  if (!bps) return "—";
  return bps >= 1_000_000
    ? `${(bps / 1_000_000).toFixed(2)} Mbps`
    : `${Math.round(bps / 1000)} kbps`;
}

function formatDuration(ticks?: number): string {
  if (!ticks) return "—";
  const totalSeconds = Math.floor(ticks / 10_000_000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function ProbeResults({ sources }: { sources: MediaSourceInfo[] }) {
  return (
    <ScrollArea className="max-h-[70vh] pr-4">
      <div className="text-sm space-y-6">
        {sources.map((source, idx) => {
          const videoStreams =
            source.MediaStreams?.filter((s) => s.Type === "Video") ?? [];
          const audioStreams =
            source.MediaStreams?.filter((s) => s.Type === "Audio") ?? [];
          const subtitleStreams =
            source.MediaStreams?.filter((s) => s.Type === "Subtitle") ?? [];

          return (
            <section key={source.Id ?? idx}>
              {sources.length > 1 && (
                <h3 className="font-semibold text-lg mb-2 font-poppins">
                  Source {idx + 1}: {source.Name ?? source.Container ?? source.Id}
                </h3>
              )}

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
                <dt className="font-semibold">Container</dt>
                <dd className="font-mono">{source.Container?.toUpperCase() ?? "—"}</dd>

                <dt className="font-semibold">Protocol</dt>
                <dd>{source.Protocol ?? "—"}</dd>

                <dt className="font-semibold">Size</dt>
                <dd>{formatBytes(source.Size)}</dd>

                <dt className="font-semibold">Bitrate</dt>
                <dd>{formatBitrate(source.Bitrate)}</dd>

                <dt className="font-semibold">Duration</dt>
                <dd>{formatDuration(source.RunTimeTicks)}</dd>

                <dt className="font-semibold">Remote</dt>
                <dd>{source.IsRemote ? "Yes" : "No"}</dd>
              </dl>

              <div className="flex gap-2 mb-4 flex-wrap">
                {source.SupportsDirectPlay && (
                  <Badge variant="secondary">Direct Play</Badge>
                )}
                {source.SupportsDirectStream && (
                  <Badge variant="secondary">Direct Stream</Badge>
                )}
                {source.SupportsTranscoding && (
                  <Badge variant="secondary">Transcode</Badge>
                )}
              </div>

              {videoStreams.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-base mb-2 font-poppins">Video</h4>
                  {videoStreams.map((stream) => (
                    <dl
                      key={stream.Index}
                      className="grid grid-cols-2 gap-x-4 gap-y-2 pl-4 mb-3"
                    >
                      <dt className="font-semibold">Codec</dt>
                      <dd className="font-mono">
                        {stream.DisplayTitle ?? stream.Codec ?? "—"}
                      </dd>

                      {stream.Width && stream.Height && (
                        <>
                          <dt className="font-semibold">Resolution</dt>
                          <dd>{stream.Width}×{stream.Height}</dd>
                        </>
                      )}

                      {stream.RealFrameRate != null && (
                        <>
                          <dt className="font-semibold">Frame Rate</dt>
                          <dd>{stream.RealFrameRate.toFixed(3)} fps</dd>
                        </>
                      )}

                      {stream.Profile && (
                        <>
                          <dt className="font-semibold">Profile</dt>
                          <dd>{stream.Profile}</dd>
                        </>
                      )}

                      {stream.BitDepth != null && (
                        <>
                          <dt className="font-semibold">Bit Depth</dt>
                          <dd>{stream.BitDepth} bit</dd>
                        </>
                      )}

                      {stream.PixelFormat && (
                        <>
                          <dt className="font-semibold">Pixel Format</dt>
                          <dd className="font-mono">{stream.PixelFormat}</dd>
                        </>
                      )}

                      {stream.BitRate != null && (
                        <>
                          <dt className="font-semibold">Bitrate</dt>
                          <dd>{Math.round(stream.BitRate / 1000)} kbps</dd>
                        </>
                      )}
                    </dl>
                  ))}
                </div>
              )}

              {audioStreams.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-base mb-2 font-poppins">Audio</h4>
                  {audioStreams.map((stream) => (
                    <dl
                      key={stream.Index}
                      className="grid grid-cols-2 gap-x-4 gap-y-2 pl-4 mb-3"
                    >
                      <dt className="font-semibold">Codec</dt>
                      <dd className="font-mono">
                        {stream.DisplayTitle ?? stream.Codec ?? "—"}
                      </dd>

                      {stream.Language && (
                        <>
                          <dt className="font-semibold">Language</dt>
                          <dd>{stream.Language}</dd>
                        </>
                      )}

                      {stream.Channels != null && (
                        <>
                          <dt className="font-semibold">Channels</dt>
                          <dd>{stream.Channels}ch</dd>
                        </>
                      )}

                      {stream.SampleRate != null && (
                        <>
                          <dt className="font-semibold">Sample Rate</dt>
                          <dd>{(stream.SampleRate / 1000).toFixed(1)} kHz</dd>
                        </>
                      )}

                      {stream.BitRate != null && (
                        <>
                          <dt className="font-semibold">Bitrate</dt>
                          <dd>{Math.round(stream.BitRate / 1000)} kbps</dd>
                        </>
                      )}

                      <dt className="font-semibold">Default</dt>
                      <dd>{stream.IsDefault ? "Yes" : "No"}</dd>
                    </dl>
                  ))}
                </div>
              )}

              {subtitleStreams.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-base mb-2 font-poppins">
                    Subtitles
                  </h4>
                  {subtitleStreams.map((stream) => (
                    <dl
                      key={stream.Index}
                      className="grid grid-cols-2 gap-x-4 gap-y-2 pl-4 mb-3"
                    >
                      <dt className="font-semibold">Language</dt>
                      <dd>{stream.Language ?? "—"}</dd>

                      <dt className="font-semibold">Codec</dt>
                      <dd className="font-mono">{stream.Codec ?? "—"}</dd>

                      <dt className="font-semibold">Default</dt>
                      <dd>{stream.IsDefault ? "Yes" : "No"}</dd>

                      {stream.IsForced && (
                        <>
                          <dt className="font-semibold">Forced</dt>
                          <dd>Yes</dd>
                        </>
                      )}
                    </dl>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </ScrollArea>
  );
}

export function ProbeMediaDialog({ itemId, className }: ProbeMediaDialogProps) {
  const [sources, setSources] = useState<MediaSourceInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleProbe = async () => {
    setLoading(true);
    setError(null);
    setSources(null);
    try {
      const result = await probeMedia(itemId);
      setSources(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setError(null); setSources(null); } }}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={className}
          onClick={() => {
            if (!open) handleProbe();
          }}
        >
          <Cpu className="h-4 w-4" />
          <span className="ml-2 text-sm sm:hidden">Probe</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl dark:bg-background/30 backdrop-blur-md z-9999999999">
        <DialogHeader>
          <DialogTitle>Media Probe Results</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Probing media source…</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <p className="text-destructive font-medium">Probe failed</p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {error}
            </p>
          </div>
        )}

        {sources && !loading && <ProbeResults sources={sources} />}
      </DialogContent>
    </Dialog>
  );
}
