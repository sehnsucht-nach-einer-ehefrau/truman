"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import {
  ReportDatabase,
  ReportData,
  DailyReport,
  YearlyReport,
} from "@/lib/report-db";

// Import shadcn/ui components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  Calendar,
  BarChart2,
  ChevronLeft,
  Download,
} from "lucide-react";

import { TooltipProps } from "recharts";
// for recharts v2.1 and above
import {
  ValueType,
  NameType,
} from "recharts/types/component/DefaultTooltipContent";

// Define colors for the pie chart
const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#8dd1e1",
];

interface Report {
  id: string;
  title: string;
  data: ReportData;
  date?: string; // For daily reports
  year?: string; // For yearly reports
  type: "daily" | "yearly";
}

const DynamicReportPage: React.FC = () => {
  const router = useRouter();
  const params = useSearchParams();

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract report type and ID from the URL params
  const reportType = params.get("type") || "daily";
  const reportId = params.get("id") || "";

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);

        let id = reportId;
        const type = reportType as "daily" | "yearly";

        // If no ID is provided, use today's date for daily report
        if (!id && type === "daily") {
          id = new Date().toISOString().split("T")[0];
        }

        // Initialize the report database
        const reportDB = ReportDatabase.getInstance();
        await reportDB.initialize();

        let fetchedReport: DailyReport | YearlyReport | undefined;

        // Fetch the appropriate report based on type
        if (type === "daily") {
          fetchedReport = await reportDB.getDailyReport(id);
        } else if (type === "yearly") {
          fetchedReport = await reportDB.getYearlyReport(id);
        }

        if (!fetchedReport) {
          setError(`No ${type} report found for ID: ${id}`);
        } else {
          // Convert to unified Report format
          const processedReport: Report = {
            id: fetchedReport.id,
            title: fetchedReport.title,
            data: fetchedReport.data,
            type: type,
            ...(type === "daily"
              ? { date: (fetchedReport as DailyReport).date }
              : {}),
            ...(type === "yearly"
              ? { year: (fetchedReport as YearlyReport).year }
              : {}),
          };

          setReport(processedReport);
        }
      } catch (err) {
        console.error("Error fetching report:", err);
        setError("Failed to load the report");
      } finally {
        setLoading(false);
      }
    };

    if (reportId || reportType === "daily") {
      fetchReport();
    } else {
      setError("Invalid report parameters");
      setLoading(false);
    }
  }, [reportId, reportType]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading Report
            </CardTitle>
            <CardDescription>
              Please wait while we fetch your report...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-[200px] w-full rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[80%]" />
              <Skeleton className="h-4 w-[60%]" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || "No report data available"}
            <div className="mt-4">
              <Button variant="outline" onClick={() => router.push("/")}>
                Return to Dashboard
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Custom tooltip for the pie chart
  const CustomTooltip = ({
    active,
    payload,
  }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Card className="p-2 border shadow-sm">
          <CardContent className="p-2">
            <p className="font-normal">{data.name}</p>
            <p>Activities: {data.value}</p>
            <p>
              Percentage:{" "}
              {(data.value / getTotalActivities(report.data)).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      );
    }
    return null;
  };

  // Calculate total activities for percentage
  const getTotalActivities = (data: ReportData) => {
    return data.pieChart.reduce((sum, item) => sum + item.value, 0);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/")}
                className="mr-2"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-2xl">{report.title}</CardTitle>
                  <Badge
                    variant={report.type === "daily" ? "default" : "secondary"}
                  >
                    {report.type === "daily" ? "Daily Report" : "Annual Report"}
                  </Badge>
                </div>
                <CardDescription>
                  {report.type === "daily" && report.date ? (
                    <div className="flex items-center mt-1">
                      <Calendar className="mr-2 h-4 w-4" />
                      {formatDate(report.date)}
                    </div>
                  ) : (
                    <div className="flex items-center mt-1">
                      <BarChart2 className="mr-2 h-4 w-4" />
                      Annual Report for Year {report.year}
                    </div>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  let id = reportId;
                  const type = reportType as "daily" | "yearly";

                  // If no ID is provided, use today's date for daily report
                  if (!id && type === "daily") {
                    id = new Date().toISOString().split("T")[0];
                  }

                  await router.push(`/reports/print?type=${type}&id=${id}`);
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6">
          <Tabs defaultValue="chart" className="w-full">
            <TabsList className="w-full max-w-md mx-auto mb-6">
              <TabsTrigger value="chart" className="flex-1">
                Chart View
              </TabsTrigger>
              <TabsTrigger value="summary" className="flex-1">
                Summary
              </TabsTrigger>
              <TabsTrigger value="detailed" className="flex-1">
                Detailed View
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chart" className="pt-2">
              <div className="h-96 w-full mx-auto max-w-3xl">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={report.data.pieChart}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {report.data.pieChart.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="text-center mt-4">
                <p className="text-muted-foreground">
                  Total Activities: {getTotalActivities(report.data)}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="summary" className="space-y-6 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {report.data.quickReport.map((item, index) => (
                  <Card key={index} className="overflow-hidden">
                    <div
                      className="h-1"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <CardHeader className="pb-2">
                      <CardTitle>{item.category}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-normal">
                        {item.percent.toFixed(1)}%
                      </div>
                      <p className="text-muted-foreground">
                        of total activities
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="detailed" className="space-y-6 pt-2">
              {report.data.detailedReport.map((category, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <CardTitle style={{ color: COLORS[index % COLORS.length] }}>
                      {category.category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Activity</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {category.activities.map((activity, actIndex) => (
                          <TableRow key={actIndex}>
                            <TableCell>{activity.activity}</TableCell>
                            <TableCell className="text-right font-normal">
                              {activity.count}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>

        <Separator className="mt-4 print:hidden" />

        <CardFooter className="flex justify-between p-6 print:hidden">
          <Button variant="outline" onClick={() => router.replace("/")}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default DynamicReportPage;
