/**
 * report-db.ts - IndexedDB for Self-Tracking Reports
 * Stores daily and yearly reports using the IndexedDB library
 */

import { IndexedDB } from "./db"; // Assuming the original IndexedDB class is in db.ts

// Types from the original file
export type PieChartData = {
  name: string; // category name
  value: number; // number of items in category
};

export type QuickReportData = {
  category: string; // category name
  percent: number; // number of items in category / total items
};

export type Activity = {
  activity: string;
  count: number;
};

export type DetailedReportData = {
  category: string; // category name
  activities: Activity[]; // list of activities in category
};

export type ReportData = {
  pieChart: PieChartData[];
  quickReport: QuickReportData[];
  detailedReport: DetailedReportData[];
};

// Additional types for database structure
export type DailyReport = {
  id: string; // format: YYYY-MM-DD
  date: string; // ISO date string
  title: string; // Optional title for the report
  data: ReportData;
};

export type YearlyReport = {
  id: string; // format: YYYY
  year: string; // Year of the report
  title: string; // Optional title for the report
  data: ReportData;
};

// Database configuration types
export type StoreConfig = {
  name: string;
  keyPath: string;
  autoIncrement?: boolean;
  indices?: {
    name: string;
    keyPath: string | string[];
    options?: IDBIndexParameters;
  }[];
};

export type DBConfig = {
  name: string;
  version: number;
  stores: StoreConfig[];
};

// Report database class
export class ReportDatabase {
  public db: IndexedDB;
  private static instance: ReportDatabase;

  // Store names
  public static readonly DAILY_REPORTS_STORE = "dailyReports";
  public static readonly YEARLY_REPORTS_STORE = "yearlyReports";

  /**
   * Create a new ReportDatabase instance (or return existing one)
   * @returns ReportDatabase instance
   */
  public static getInstance(): ReportDatabase {
    if (!ReportDatabase.instance) {
      ReportDatabase.instance = new ReportDatabase();
    }
    return ReportDatabase.instance;
  }

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    const dbConfig: DBConfig = {
      name: "selfTrackingReports",
      version: 1,
      stores: [
        {
          name: ReportDatabase.DAILY_REPORTS_STORE,
          keyPath: "id",
          indices: [
            {
              name: "date",
              keyPath: "date",
            },
          ],
        },
        {
          name: ReportDatabase.YEARLY_REPORTS_STORE,
          keyPath: "id",
          indices: [
            {
              name: "year",
              keyPath: "year",
            },
          ],
        },
      ],
    };

    this.db = new IndexedDB(dbConfig);
  }

  /**
   * Initialize the database connection
   * @returns Promise that resolves when the database is opened
   */
  public async initialize(): Promise<IDBDatabase> {
    return this.db.connect();
  }

  /**
   * Close the database connection
   */
  public close(): void {
    this.db.close();
  }

  /**
   * Add a daily report
   * @param report Daily report to add
   * @returns Promise that resolves with the key of the added report
   */
  public async addDailyReport(report: DailyReport): Promise<IDBValidKey> {
    return this.db.add(ReportDatabase.DAILY_REPORTS_STORE, report);
  }

  /**
   * Update an existing daily report
   * @param report Daily report to update
   * @returns Promise that resolves with the key of the updated report
   */
  public async updateDailyReport(report: DailyReport): Promise<IDBValidKey> {
    return this.db.put(ReportDatabase.DAILY_REPORTS_STORE, report);
  }

  /**
   * Get a daily report by its ID (date in YYYY-MM-DD format)
   * @param id Report ID (YYYY-MM-DD)
   * @returns Promise that resolves with the report or undefined if not found
   */
  public async getDailyReport(id: string): Promise<DailyReport | undefined> {
    return this.db.get<DailyReport>(ReportDatabase.DAILY_REPORTS_STORE, id);
  }

  /**
   * Delete a daily report by its ID
   * @param id Report ID (YYYY-MM-DD)
   * @returns Promise that resolves when the report is deleted
   */
  public async deleteDailyReport(id: string): Promise<void> {
    return this.db.delete(ReportDatabase.DAILY_REPORTS_STORE, id);
  }

  /**
   * Get all daily reports
   * @returns Promise that resolves with all daily reports
   */
  public async getAllDailyReports(): Promise<DailyReport[]> {
    return this.db.getAll<DailyReport>(ReportDatabase.DAILY_REPORTS_STORE);
  }

  /**
   * Get daily reports for a specific month (YYYY-MM)
   * @param yearMonth Year and month in YYYY-MM format
   * @returns Promise that resolves with matching reports
   */
  public async getDailyReportsByMonth(
    yearMonth: string,
  ): Promise<DailyReport[]> {
    const prefix = yearMonth + "-";
    const range = IndexedDB.createRange.prefix(prefix);

    return this.db.search<DailyReport>(ReportDatabase.DAILY_REPORTS_STORE, {
      range: range,
    });
  }

  /**
   * Get the count of daily reports
   * @returns Promise that resolves with the count
   */
  public async getDailyReportCount(): Promise<number> {
    return this.db.count(ReportDatabase.DAILY_REPORTS_STORE);
  }

  /**
   * Add a yearly report
   * @param report Yearly report to add
   * @returns Promise that resolves with the key of the added report
   */
  public async addYearlyReport(report: YearlyReport): Promise<IDBValidKey> {
    return this.db.add(ReportDatabase.YEARLY_REPORTS_STORE, report);
  }

  /**
   * Update an existing yearly report
   * @param report Yearly report to update
   * @returns Promise that resolves with the key of the updated report
   */
  public async updateYearlyReport(report: YearlyReport): Promise<IDBValidKey> {
    return this.db.put(ReportDatabase.YEARLY_REPORTS_STORE, report);
  }

  /**
   * Get a yearly report by its ID (year in YYYY format)
   * @param id Report ID (YYYY)
   * @returns Promise that resolves with the report or undefined if not found
   */
  public async getYearlyReport(id: string): Promise<YearlyReport | undefined> {
    return this.db.get<YearlyReport>(ReportDatabase.YEARLY_REPORTS_STORE, id);
  }

  /**
   * Delete a yearly report by its ID
   * @param id Report ID (YYYY)
   * @returns Promise that resolves when the report is deleted
   */
  public async deleteYearlyReport(id: string): Promise<void> {
    return this.db.delete(ReportDatabase.YEARLY_REPORTS_STORE, id);
  }

  /**
   * Get all yearly reports
   * @returns Promise that resolves with all yearly reports
   */
  public async getAllYearlyReports(): Promise<YearlyReport[]> {
    return this.db.getAll<YearlyReport>(ReportDatabase.YEARLY_REPORTS_STORE);
  }

  /**
   * Get the count of yearly reports
   * @returns Promise that resolves with the count
   */
  public async getYearlyReportCount(): Promise<number> {
    return this.db.count(ReportDatabase.YEARLY_REPORTS_STORE);
  }

  /**
   * Delete reports older than a certain date
   * @param olderThan Date threshold
   * @returns Promise that resolves when cleanup is complete
   */
  public async cleanupOldReports(olderThan: Date): Promise<void> {
    const olderThanStr = olderThan.toISOString().split("T")[0]; // Format as YYYY-MM-DD
    const range = IndexedDB.createRange.lessThan(olderThanStr);

    // Get all reports older than the threshold
    const oldReports = await this.db.search<DailyReport>(
      ReportDatabase.DAILY_REPORTS_STORE,
      { range },
    );

    // Delete each old report
    const deletePromises = oldReports.map((report) =>
      this.db.delete(ReportDatabase.DAILY_REPORTS_STORE, report.id),
    );

    await Promise.all(deletePromises);
  }

  /**
   * Get report data for visualization
   * @param reportId ID of the report to visualize (either daily or yearly)
   * @param isYearly Whether it's a yearly report
   * @returns Promise that resolves with the report data
   */
  public async getReportForVisualization(
    reportId: string,
    isYearly: boolean = false,
  ): Promise<ReportData | undefined> {
    const storeName = isYearly
      ? ReportDatabase.YEARLY_REPORTS_STORE
      : ReportDatabase.DAILY_REPORTS_STORE;

    const report = await this.db.get<DailyReport | YearlyReport>(
      storeName,
      reportId,
    );
    return report?.data;
  }

  /**
   * Generate a yearly report from daily reports
   * @param year Year to generate report for (YYYY)
   * @returns Promise that resolves with the generated yearly report
   */
  public async generateYearlyReport(year: string): Promise<YearlyReport> {
    // Get all daily reports for the specified year
    const dailyReports = await this.getDailyReportsByYear(year);

    if (dailyReports.length === 0) {
      throw new Error(`No daily reports found for year ${year}`);
    }

    // Merge all daily reports into a single yearly report
    const mergedData = this.mergeReportData(
      dailyReports.map((report) => report.data),
    );

    // Create the yearly report
    const yearlyReport: YearlyReport = {
      id: year,
      year,
      title: `Annual Report ${year}`,
      data: mergedData,
    };

    return yearlyReport;
  }

  /**
   * Get daily reports for a specific year
   * @param year Year in YYYY format
   * @returns Promise that resolves with matching reports
   */
  private async getDailyReportsByYear(year: string): Promise<DailyReport[]> {
    const prefix = year + "-";
    const range = IndexedDB.createRange.prefix(prefix);

    return this.db.search<DailyReport>(ReportDatabase.DAILY_REPORTS_STORE, {
      range: range,
    });
  }

  /**
   * Merge multiple report data objects into a single report
   * @param reportDataArray Array of report data to merge
   * @returns Merged report data
   */
  private mergeReportData(reportDataArray: ReportData[]): ReportData {
    // Initialize result structure
    const result: ReportData = {
      pieChart: [],
      quickReport: [],
      detailedReport: [],
    };

    // Maps to aggregate data
    const categoryTotals = new Map<string, number>();
    const categoryActivities = new Map<string, Map<string, number>>();
    let grandTotal = 0;

    // Process all report data
    for (const reportData of reportDataArray) {
      // Process pie chart data
      for (const item of reportData.pieChart) {
        const current = categoryTotals.get(item.name) || 0;
        categoryTotals.set(item.name, current + item.value);
        grandTotal += item.value;
      }

      // Process detailed report data to gather activities
      for (const detail of reportData.detailedReport) {
        if (!categoryActivities.has(detail.category)) {
          categoryActivities.set(detail.category, new Map<string, number>());
        }

        const activityMap = categoryActivities.get(detail.category)!;

        for (const activity of detail.activities) {
          const current = activityMap.get(activity.activity) || 0;
          activityMap.set(activity.activity, current + activity.count);
        }
      }
    }

    // Build the merged pie chart data
    for (const [name, value] of categoryTotals.entries()) {
      result.pieChart.push({ name, value });
    }

    // Build the merged quick report data
    for (const [category, value] of categoryTotals.entries()) {
      const percent = (value / grandTotal) * 100;
      result.quickReport.push({ category, percent });
    }

    // Build the merged detailed report data
    for (const [category, activityMap] of categoryActivities.entries()) {
      const activities: Activity[] = [];

      for (const [activity, count] of activityMap.entries()) {
        activities.push({ activity, count });
      }

      // Sort activities by count in descending order
      activities.sort((a, b) => b.count - a.count);

      result.detailedReport.push({ category, activities });
    }

    return result;
  }

  /**
   * Export all reports to JSON
   * @returns Promise that resolves with the exported data
   */
  public async exportAllReports(): Promise<{
    dailyReports: DailyReport[];
    yearlyReports: YearlyReport[];
  }> {
    const [dailyReports, yearlyReports] = await Promise.all([
      this.getAllDailyReports(),
      this.getAllYearlyReports(),
    ]);

    return { dailyReports, yearlyReports };
  }

  /**
   * Import reports from exported data
   * @param data Exported report data
   * @returns Promise that resolves when import is complete
   */
  public async importReports(data: {
    dailyReports?: DailyReport[];
    yearlyReports?: YearlyReport[];
  }): Promise<void> {
    // Process in a transaction for atomicity
    if (data.dailyReports && data.dailyReports.length > 0) {
      await this.db.clear(ReportDatabase.DAILY_REPORTS_STORE);
      await this.db.addMultiple(
        ReportDatabase.DAILY_REPORTS_STORE,
        data.dailyReports,
      );
    }

    if (data.yearlyReports && data.yearlyReports.length > 0) {
      await this.db.clear(ReportDatabase.YEARLY_REPORTS_STORE);
      await this.db.addMultiple(
        ReportDatabase.YEARLY_REPORTS_STORE,
        data.yearlyReports,
      );
    }
  }
}
