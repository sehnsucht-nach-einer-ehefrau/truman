"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { ReportDatabase, ReportData, DailyReport } from "@/lib/report-db";

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
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

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

const ReportPage: React.FC = () => {
  const router = useRouter();
  const params = useSearchParams();

  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reportType = params.get("type") || "daily";
  const reportId = params.get("id") || "";

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);

        let id = reportId;
        const type = reportType as "daily" | "yearly";

        // If no ID is provided, use today's date for daily report
        if (!id && type === "daily") {
          id = new Date().toISOString().split("T")[0];
        }

        // Initialize the report database
        const reportDB = ReportDatabase.getInstance();
        await reportDB.initialize();

        // Fetch the most recent daily report (today's)
        const dailyReport = await reportDB.getDailyReport(id);

        if (!dailyReport) {
          setError(`No report found for ${id}`);
        } else {
          setReport(dailyReport);
        }
      } catch (err) {
        console.error("Error fetching report:", err);
        setError("Failed to load the report");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, []);

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
              Please wait while we fetch your daily report...
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
    <div className="scale-90">
      <div className="container mx-auto px-4 py-8 max-w-6xl border border-border rounded-xl">
        <div className="flex flex-col items-center mt-12 w-full">
          <h1 className="text-xl mb-2">Report</h1>
          <div className="w-[80%] border-t-2 border-border mt-2 mb-8"></div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={report.data.pieChart}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={120}
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

        <div className="mb-8 text-center mx-28">
          <div className="w-full border-t-2 border-border mt-2 mb-8 mx-auto"></div>
          <h2 className="text-2xl font-normal mb-4">Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {report.data.quickReport.map((item, index) => (
              <Card key={index} className="overflow-hidden">
                <div
                  className="h-1"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></div>
                <CardHeader>
                  <CardTitle>{item.category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-normal">
                    {item.percent.toFixed(1)}%
                  </div>
                  <p className="text-muted-foreground">of total activities</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <h2 className="text-2xl font-normal mb-4 mx-28">Detailed Activities</h2>
        <div className="space-y-8 mb-8  mx-28">
          {report.data.detailedReport.map((category, index) => (
            <Card key={index}>
              <CardHeader>
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
        </div>

        <Card className="mx-28 no-print">
          <CardFooter className="flex justify-between p-6 no-print">
            <Button
              variant="outline"
              onClick={() => {
                let id = reportId;
                const type = reportType as "daily" | "yearly";

                // If no ID is provided, use today's date for daily report
                if (!id && type === "daily") {
                  id = new Date().toISOString().split("T")[0];
                }
                router.replace(`/reports?type=${type}&id=${id}`);
              }}
            >
              Back to Statistics
            </Button>

            <Button onClick={() => window.print()}>Print Report</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ReportPage;
