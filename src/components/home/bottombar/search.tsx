"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ReportDatabase, DailyReport, YearlyReport } from "@/lib/report-db";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandInput,
  CommandSeparator,
} from "@/components/ui/command";

import { Search, Calendar, BarChart, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  id: string;
  date: string;
  title: string;
  type: "daily" | "yearly";
  categories: string[];
  topActivities: string[];
  totalActivities: number;
}

export default function EnhancedReportSearch() {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [reportDb, setReportDb] = useState<ReportDatabase | null>(null);
  const [loading, setLoading] = useState(false);

  // Initialize the database
  useEffect(() => {
    const initDb = async () => {
      const db = ReportDatabase.getInstance();
      await db.initialize();
      setReportDb(db);

      // Load recent searches from localStorage
      const savedSearches = localStorage.getItem("recentReportSearches");
      if (savedSearches) {
        setRecentSearches(JSON.parse(savedSearches));
      }
    };

    initDb();

    return () => {
      // Clean up by closing the database connection
      if (reportDb) {
        reportDb.close();
      }
    };
  }, []);

  // Keyboard shortcut to open search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Search when query changes with debounce
  useEffect(() => {
    if (!reportDb) return;

    // Don't search if query is empty (show recents instead)
    if (!searchQuery) {
      fetchRecentReports();
      return;
    }

    setLoading(true);

    // Debounce search
    const handler = setTimeout(() => {
      searchReportDatabase(searchQuery);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery, reportDb]);

  // Memoized function to process reports
  const processReportForSearch = useCallback(
    (
      report: DailyReport | YearlyReport,
      type: "daily" | "yearly",
    ): SearchResult => {
      // Get top categories from pie chart
      const categories = report.data.pieChart
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)
        .map((item) => item.name);

      // Get top activities across all categories
      const allActivities = report.data.detailedReport.flatMap((category) =>
        category.activities.map((activity) => ({
          activity: activity.activity,
          count: activity.count,
          category: category.category,
        })),
      );

      const topActivities = allActivities
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map((item) => `${item.activity} (${item.category})`);

      const totalActivities = report.data.pieChart.reduce(
        (sum, item) => sum + item.value,
        0,
      );

      return {
        id: report.id,
        date:
          type === "daily"
            ? (report as DailyReport).date
            : (report as YearlyReport).year,
        title: report.title,
        type,
        categories,
        topActivities,
        totalActivities,
      };
    },
    [],
  );

  // Search function for ReportDatabase
  const searchReportDatabase = async (query: string) => {
    if (!reportDb) return;

    try {
      setLoading(true);
      const lowercaseQuery = query.toLowerCase();

      // Get all reports
      const [dailyReports, yearlyReports] = await Promise.all([
        reportDb.getAllDailyReports(),
        reportDb.getAllYearlyReports(),
      ]);

      // Filter daily reports
      const filteredDailyReports = dailyReports
        .filter((report) => {
          const dateMatch = report.date.toLowerCase().includes(lowercaseQuery);
          const titleMatch = report.title
            .toLowerCase()
            .includes(lowercaseQuery);

          // Search within categories
          const categoryMatch = report.data.pieChart.some((item) =>
            item.name.toLowerCase().includes(lowercaseQuery),
          );

          // Search within activities
          const activityMatch = report.data.detailedReport.some((category) =>
            category.activities.some((activity) =>
              activity.activity.toLowerCase().includes(lowercaseQuery),
            ),
          );

          return dateMatch || titleMatch || categoryMatch || activityMatch;
        })
        .map((report) => processReportForSearch(report, "daily"));

      // Filter yearly reports
      const filteredYearlyReports = yearlyReports
        .filter((report) => {
          const yearMatch = report.year.toLowerCase().includes(lowercaseQuery);
          const titleMatch = report.title
            .toLowerCase()
            .includes(lowercaseQuery);

          // Search within categories
          const categoryMatch = report.data.pieChart.some((item) =>
            item.name.toLowerCase().includes(lowercaseQuery),
          );

          // Search within activities
          const activityMatch = report.data.detailedReport.some((category) =>
            category.activities.some((activity) =>
              activity.activity.toLowerCase().includes(lowercaseQuery),
            ),
          );

          return yearMatch || titleMatch || categoryMatch || activityMatch;
        })
        .map((report) => processReportForSearch(report, "yearly"));

      // Combine and sort results (newest first)
      const combinedResults = [
        ...filteredDailyReports,
        ...filteredYearlyReports,
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setSearchResults(combinedResults);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch recent reports for initial display
  const fetchRecentReports = async () => {
    if (!reportDb) return;

    try {
      setLoading(true);
      const [dailyReports, yearlyReports] = await Promise.all([
        reportDb.getAllDailyReports(),
        reportDb.getAllYearlyReports(),
      ]);

      // Process daily reports
      const dailyResults = dailyReports.map((report) =>
        processReportForSearch(report, "daily"),
      );

      // Process yearly reports
      const yearlyResults = yearlyReports.map((report) =>
        processReportForSearch(report, "yearly"),
      );

      // Combine, sort by date (newest first) and take top 5
      const recentResults = [...dailyResults, ...yearlyResults]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      setSearchResults(recentResults);
    } catch (error) {
      console.error("Error fetching recent reports:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle report selection
  const handleReportSelect = (result: SearchResult) => {
    // Save search query to recent searches if it's not empty
    if (searchQuery.trim()) {
      const updatedSearches = [
        searchQuery,
        ...recentSearches.filter((s) => s !== searchQuery),
      ].slice(0, 5);
      setRecentSearches(updatedSearches);
      localStorage.setItem(
        "recentReportSearches",
        JSON.stringify(updatedSearches),
      );
    }

    // Navigate to report view page with ID and type parameters
    router.push(`/reports?type=${result.type}&id=${result.id}`);
    setSearchOpen(false);
  };

  // Handle recent search selection
  const handleRecentSearchSelect = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        className="w-[240px] justify-start text-muted-foreground h-10"
        onClick={() => setSearchOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span>Search reports...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <div className="flex items-center border-b px-3 p-0 overflow-hidden rounded-lg border shadow-md">
          <CommandInput
            placeholder="Search reports by date, title, activities..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="flex h-12 w-screen rounded-md border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <CommandList className="max-h-[400px] overflow-y-auto py-2">
          {loading && (
            <div className="py-6 text-center text-sm">Searching reports...</div>
          )}

          {!loading && searchQuery && searchResults.length === 0 && (
            <CommandEmpty className="py-6 text-center">
              No reports found. Try a different search term.
            </CommandEmpty>
          )}

          {recentSearches.length > 0 && !searchQuery && (
            <>
              <CommandGroup heading="Recent Searches">
                {recentSearches.map((term, index) => (
                  <CommandItem
                    key={`recent-${index}`}
                    onSelect={() => handleRecentSearchSelect(term)}
                    className="flex items-center px-4 py-2"
                  >
                    <Clock className="mr-2 h-4 w-4 opacity-50" />
                    <span>{term}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {searchResults.length > 0 && (
            <CommandGroup
              heading={searchQuery ? "Search Results" : "Recent Reports"}
            >
              {searchResults.map((result) => (
                <CommandItem
                  key={`${result.type}-${result.id}`}
                  onSelect={() => handleReportSelect(result)}
                  className="px-4 py-3 cursor-pointer"
                >
                  <div className="flex flex-col space-y-1 w-full">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        {result.type === "daily" ? (
                          <Calendar className="mr-2 h-4 w-4 text-blue-500" />
                        ) : (
                          <BarChart className="mr-2 h-4 w-4 text-green-500" />
                        )}
                        <span className="font-medium text-base">
                          {result.title || result.date}
                        </span>
                      </div>
                      <Badge
                        variant={
                          result.type === "daily" ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {result.type === "daily" ? "Daily" : "Annual"}
                      </Badge>
                    </div>

                    <span className="text-sm text-muted-foreground">
                      {result.type === "daily"
                        ? new Date(result.date).toLocaleDateString()
                        : `Year ${result.date}`}
                      {" • "}
                      {result.totalActivities} activities
                    </span>

                    {result.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {result.categories.map((category, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
