import { PlayCircle, PauseCircle, AlertCircle, TrendingUp } from 'lucide-react';

interface ScheduleStatsData {
  active: number;
  paused: number;
  failed: number;
  runsThisWeek: number;
}

interface ScheduleStatsProps {
  stats: ScheduleStatsData;
}

export function ScheduleStats({ stats }: ScheduleStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <PlayCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            <p className="text-sm text-gray-500">Active</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <PauseCircle className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.paused}</p>
            <p className="text-sm text-gray-500">Paused</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.failed}</p>
            <p className="text-sm text-gray-500">Failed</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rocket-100 rounded-lg">
            <TrendingUp className="h-5 w-5 text-rocket-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.runsThisWeek}</p>
            <p className="text-sm text-gray-500">Runs This Week</p>
          </div>
        </div>
      </div>
    </div>
  );
}
