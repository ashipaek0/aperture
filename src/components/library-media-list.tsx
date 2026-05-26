"use client";
import { useEffect, useRef, useCallback } from "react";
import { MediaCard } from "../components/media-card";
import {
  BaseItemDto,
  ItemSortBy,
  SortOrder,
} from "@jellyfin/sdk/lib/generated-client/models";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import {
  ChevronDown,
  Search,
  Type,
  Dice6,
  Star,
  ThumbsUp,
  Calendar,
  CalendarDays,
  Clock,
  ArrowUp,
  ArrowDown,
  Dices,
  Heart,
  Loader2,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { LiveChannelCard } from "./live-channel-card";

type SortFieldDef = {
  value: string;
  label: string;
};

type SortOrderDef = {
  value: string;
  label: string;
};

const getSortFieldIcon = (fieldValue: string) => {
  const iconMap: Record<string, any> = {
    SortName: Type,
    Random: Dice6,
    CommunityRating: Star,
    CriticRating: ThumbsUp,
    DateCreated: Calendar,
    PremiereDate: CalendarDays,
    Runtime: Clock,
    ProductionYear: Calendar,
    IsFavoriteOrLiked: Heart,
  };
  return iconMap[fieldValue] || Type;
};

const sortFields: SortFieldDef[] = [
  { value: ItemSortBy.PremiereDate, label: "Release Date" },
  { value: ItemSortBy.DateCreated, label: "Date Added" },
  { value: ItemSortBy.SortName, label: "Name" },
  { value: ItemSortBy.CommunityRating, label: "Community Rating" },
  { value: ItemSortBy.CriticRating, label: "Critics Rating" },
  { value: ItemSortBy.Runtime, label: "Runtime" },
  { value: ItemSortBy.ProductionYear, label: "Year" },
  { value: ItemSortBy.IsFavoriteOrLiked, label: "Favorites" },
  { value: "Random", label: "Random" },
];

const sortOrdersDef: SortOrderDef[] = [
  { value: SortOrder.Descending, label: "Descending" },
  { value: SortOrder.Ascending, label: "Ascending" },
];

interface LibraryMediaListProps {
  mediaItems: BaseItemDto[];
  serverUrl: string;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  sortBy: string;
  sortOrder: string;
  onSortChange: (sortBy: string, sortOrder: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
}

export function LibraryMediaList({
  mediaItems,
  serverUrl,
  hasMore,
  loadingMore,
  onLoadMore,
  sortBy,
  sortOrder,
  onSortChange,
  searchQuery,
  onSearchChange,
  onRefresh,
}: LibraryMediaListProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Infinite scroll via Intersection Observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          onLoadMore();
        }
      },
      { rootMargin: "400px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

  const handleSearchInput = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSearchChange(value);
      }, 300);
    },
    [onSearchChange],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const selectedField = sortFields.find((f) => f.value === sortBy);
  const selectedFieldLabel = selectedField?.label || "Release Date";
  const selectedOrderLabel =
    sortOrdersDef.find((o) => o.value === sortOrder)?.label || "Descending";
  const SelectedFieldIcon = getSortFieldIcon(sortBy);
  const SelectedOrderIcon =
    sortOrder === SortOrder.Ascending ? ArrowUp : ArrowDown;

  return (
    <div className="space-y-4">
      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search media..."
            defaultValue={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <SelectedFieldIcon className="h-4 w-4" />
                Sort: {selectedFieldLabel}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {sortFields.map((field) => {
                const FieldIcon = getSortFieldIcon(field.value);
                return (
                  <DropdownMenuItem
                    key={field.value}
                    onClick={() => onSortChange(field.value, sortOrder)}
                    className={`gap-2 ${sortBy === field.value ? "bg-accent" : ""}`}
                  >
                    <FieldIcon className="h-4 w-4" />
                    {field.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {sortBy !== "Random" && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                onSortChange(
                  sortBy,
                  sortOrder === SortOrder.Ascending
                    ? SortOrder.Descending
                    : SortOrder.Ascending,
                )
              }
            >
              <SelectedOrderIcon className="h-4 w-4" />
              {selectedOrderLabel}
            </Button>
          )}

          {sortBy === "Random" && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRefresh}
                    className="gap-2"
                  >
                    <Dices className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reroll</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4 auto-rows-max">
        {mediaItems.map((item) =>
          item.Type !== "TvChannel" ? (
            <MediaCard
              key={item.Id}
              item={item}
              serverUrl={serverUrl}
              fullWidth
            />
          ) : (
            <LiveChannelCard key={item.Id} item={item} serverUrl={serverUrl} />
          ),
        )}
      </div>

      {/* Infinite scroll sentinel + loading indicator */}
      <div ref={sentinelRef} className="flex justify-center py-8">
        {loadingMore && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading more...</span>
          </div>
        )}
        {!hasMore && mediaItems.length > 0 && (
          <span className="text-sm text-muted-foreground">
            All {mediaItems.length} items loaded
          </span>
        )}
      </div>

      {/* Empty State */}
      {mediaItems.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-muted-foreground text-lg mb-2">
              {searchQuery ? "No matching items found" : "No items found"}
            </div>
            <div className="text-muted-foreground text-sm">
              {searchQuery
                ? `No media items match "${searchQuery}". Try adjusting your search.`
                : "This library appears to be empty."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
