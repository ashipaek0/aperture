"use client";
import { fetchLibraryItems, getLibraryById, getUser, getUserWithPolicy } from "@/src/actions";
import { getAuthData } from "@/src/actions/utils";
import { LibraryMediaList } from "@/src/components/library-media-list";
import { SearchBar } from "@/src/components/search-component";
import { ScanLibraryButton } from "@/src/components/scan-library-button";
import { AuroraBackground } from "@/src/components/aurora-background";
import { useCallback, useEffect, useRef, useState } from "react";
import { BaseItemDto, ItemSortBy, SortOrder } from "@jellyfin/sdk/lib/generated-client/models";
import LoadingSpinner from "@/src/components/loading-spinner";
import { useParams } from "next/navigation";
import ErrorWindow from "@/src/components/error-window";
import { useAuthError } from "@/src/hooks/use-auth-error";

const PAGE_SIZE = 100;

export default function LibraryPage() {
  const { id } = useParams<{ id: string }>();

  const [libraryName, setLibraryName] = useState<string>("Library");
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { handleAuthError } = useAuthError();

  const [items, setItems] = useState<BaseItemDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState<string>(ItemSortBy.PremiereDate);
  const [sortOrder, setSortOrder] = useState<string>(SortOrder.Descending);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const collectionTypeRef = useRef<string | undefined>(undefined);
  const fetchingRef = useRef(false);

  const fetchPage = useCallback(async (startIndex: number, append: boolean) => {
    if (!id?.trim() || fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const result = await fetchLibraryItems({
        id,
        collectionType: collectionTypeRef.current,
        limit: PAGE_SIZE,
        startIndex,
        sortBy: sortBy as ItemSortBy,
        sortOrder: sortOrder as SortOrder,
        searchTerm: searchQuery || undefined,
      });

      if (append) {
        setItems(prev => [...prev, ...result.items]);
      } else {
        setItems(result.items);
      }

      setTotalCount(result.totalRecordCount);
      setHasMore(startIndex + PAGE_SIZE < result.totalRecordCount);
    } catch (err: any) {
      console.error(err);
      handleAuthError(err);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, [id, sortBy, sortOrder, searchQuery, refreshKey, handleAuthError]);

  // Initial load and when sort/search changes
  useEffect(() => {
    if (!id?.trim()) return;

    const init = async () => {
      setLoading(true);
      try {
        const [authData, details] = await Promise.all([
          getAuthData(),
          getLibraryById(id),
        ]);

        if (!details) return;

        setServerUrl(authData.serverUrl);
        setLibraryName(details.Name || "Library");
        collectionTypeRef.current = details.CollectionType;
      } catch (err: any) {
        console.error(err);
        handleAuthError(err);
        setLoading(false);
        return;
      }

      await fetchPage(0, false);
    };

    init();
  }, [id, fetchPage]);

  // Fetch admin status
  useEffect(() => {
    const fetchAdminStatus = async () => {
      try {
        const currentUser = await getUser();
        if (currentUser?.Id) {
          const userWithPolicy = await getUserWithPolicy(currentUser.Id, "");
          if (userWithPolicy?.Policy?.IsAdministrator) {
            setIsAdmin(true);
          }
        }
      } catch {
        // Non-admin or fetch failed
      }
    };
    fetchAdminStatus();
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore || fetchingRef.current) return;
    setLoadingMore(true);
    fetchPage(items.length, true);
  }, [hasMore, loadingMore, items.length, fetchPage]);

  const handleSortChange = useCallback((newSortBy: string, newSortOrder: string) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  if (loading) return <LoadingSpinner />;

  if (!serverUrl || !id)
    return <ErrorWindow message="Error loading Library. Please try again." />;

  return (
    <div className="relative px-4 py-3 max-w-full overflow-hidden">
      <AuroraBackground />
      <div className="relative z-10">
        <div className="relative z-99 mb-8">
          <div className="mb-6">
            <SearchBar />
          </div>
        </div>
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-3xl font-semibold text-foreground font-poppins">
              {libraryName}
            </h2>
            <ScanLibraryButton libraryId={id} isAdmin={isAdmin} />
          </div>
          <span className="font-mono text-muted-foreground">
            {totalCount} items
          </span>
        </div>
        <LibraryMediaList
          mediaItems={items}
          serverUrl={serverUrl}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={handleLoadMore}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  );
}
