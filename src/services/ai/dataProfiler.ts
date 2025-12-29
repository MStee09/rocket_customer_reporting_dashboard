import { DataProfile } from '../../types/aiVisualization';

export function profileData(data: Record<string, any>[], columns?: string[]): DataProfile {
  if (!data.length) {
    return {
      rowCount: 0,
      columns: [],
      patterns: { hasTrend: false, hasSeasonality: false, hasOutliers: false, outlierPercent: 0, hasClustering: false },
    };
  }

  const cols = columns || Object.keys(data[0]);

  const columnProfiles = cols.map(colName => {
    const values = data.map(row => row[colName]).filter(v => v !== null && v !== undefined);
    const nullPercent = ((data.length - values.length) / data.length) * 100;

    const sampleValue = values[0];
    let type: 'numeric' | 'categorical' | 'temporal' | 'geographic';

    if (typeof sampleValue === 'number') {
      type = 'numeric';
    } else if (sampleValue instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(String(sampleValue))) {
      type = 'temporal';
    } else if (/^[A-Z]{2}$/.test(String(sampleValue)) || ['state', 'region', 'zip'].some(g => colName.toLowerCase().includes(g))) {
      type = 'geographic';
    } else {
      type = 'categorical';
    }

    const uniqueValues = [...new Set(values.map(v => String(v)))];
    const cardinality = uniqueValues.length;

    const profile: DataProfile['columns'][0] = { name: colName, type, cardinality, nullPercent };

    if (type === 'categorical' && cardinality <= 20) {
      profile.uniqueValues = uniqueValues.slice(0, 20);
    }

    if (type === 'numeric') {
      const numericValues = values.map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
      if (numericValues.length > 0) {
        const sum = numericValues.reduce((a, b) => a + b, 0);
        const mean = sum / numericValues.length;
        const median = numericValues[Math.floor(numericValues.length / 2)];
        const squaredDiffs = numericValues.map(v => Math.pow(v - mean, 2));
        const stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / numericValues.length);
        const outlierThreshold = 2 * stdDev;
        const outlierCount = numericValues.filter(v => Math.abs(v - mean) > outlierThreshold).length;

        profile.stats = {
          min: numericValues[0],
          max: numericValues[numericValues.length - 1],
          mean,
          median,
          stdDev,
          outlierCount,
        };
      }
    }

    return profile;
  });

  const numericColumns = columnProfiles.filter(c => c.type === 'numeric');
  const hasOutliers = numericColumns.some(c => c.stats && c.stats.outlierCount > 0);
  const outlierPercent = numericColumns.length > 0
    ? numericColumns.reduce((sum, c) => sum + (c.stats?.outlierCount || 0), 0) / (data.length * numericColumns.length) * 100
    : 0;

  const temporalCol = columnProfiles.find(c => c.type === 'temporal');
  const primaryNumeric = numericColumns[0];
  let hasTrend = false;
  let trendDirection: 'up' | 'down' | 'flat' | undefined;

  if (temporalCol && primaryNumeric) {
    const sortedByTime = [...data].sort((a, b) =>
      new Date(a[temporalCol.name]).getTime() - new Date(b[temporalCol.name]).getTime()
    );
    const third = Math.floor(sortedByTime.length / 3);
    if (third > 0) {
      const firstThirdAvg = sortedByTime.slice(0, third).reduce((sum, row) => sum + Number(row[primaryNumeric.name]), 0) / third;
      const lastThirdAvg = sortedByTime.slice(-third).reduce((sum, row) => sum + Number(row[primaryNumeric.name]), 0) / third;
      const changePct = ((lastThirdAvg - firstThirdAvg) / firstThirdAvg) * 100;
      if (Math.abs(changePct) > 10) {
        hasTrend = true;
        trendDirection = changePct > 0 ? 'up' : 'down';
      } else {
        trendDirection = 'flat';
      }
    }
  }

  const geoCol = columnProfiles.find(c => c.type === 'geographic');
  let geographicCoverage: DataProfile['geographicCoverage'] | undefined;

  if (geoCol) {
    const stateCounts = data.reduce((acc, row) => {
      const state = row[geoCol.name];
      if (state) acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    geographicCoverage = {
      stateCount: Object.keys(stateCounts).length,
      regionConcentration: stateCounts,
    };
  }

  return {
    rowCount: data.length,
    columns: columnProfiles,
    patterns: { hasTrend, trendDirection, hasSeasonality: false, hasOutliers, outlierPercent, hasClustering: !!geographicCoverage },
    geographicCoverage,
  };
}

export default profileData;
