type Data = {
  activity: string;
};

export function formatData(data: Data[]): string {
  let formattedData = "";
  for (const activity of data) {
    formattedData += activity["activity"] + "\n";
  }
  return formattedData.trim();
}

export function processData(data: string): string {
  const blocks = data.split("\n\n");
  const processedData: { category: string; activities: string[] }[] = [];

  for (const block of blocks) {
    const lines = block.split("\n");
    const category = lines[0];
    const activities = lines.slice(1);
    processedData.push({ category, activities: [] }); // Explicit type

    for (const activity of activities) {
      processedData[processedData.length - 1].activities.push(activity);
    }
  }
  return JSON.stringify(processedData);
}
