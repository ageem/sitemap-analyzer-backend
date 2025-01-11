'use client'

interface ProgressBarProps {
  progress: number;
  status: string;
  total: number;
  current: number;
}

export function ProgressBar({ progress, status, total, current }: ProgressBarProps) {
  return (
    <div className="p-4 mb-8 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="mb-2 flex justify-between items-center">
        <span className="text-blue-800">{status}</span>
        <span className="text-blue-600 font-medium">
          {current} / {total} URLs ({Math.round(progress)}%)
        </span>
      </div>
      <div className="w-full bg-blue-200 rounded-full h-2.5">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
