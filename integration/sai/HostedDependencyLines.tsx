import React, { useId, useState } from 'react';
import type { Dependency } from './components/ganttLayout';
import { dependencyRoute } from './HostedGanttGeometry';

interface Props {
  dependencies: Dependency[];
  onRemoveDependency?: (sourceId: string, targetId: string) => void;
}

export default function HostedDependencyLines({ dependencies, onRemoveDependency }: Props) {
  const markerId = 'benchline-dependency-' + useId().replace(/:/g, '');
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <svg
      className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible"
      aria-label="Task dependencies"
    >
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 8 8"
          refX="8"
          refY="4"
          markerWidth="8"
          markerHeight="8"
          markerUnits="userSpaceOnUse"
          orient="auto"
          overflow="visible"
        >
          <path d="M 0 0 L 8 4 L 0 8 Z" fill="#64748b" />
        </marker>
      </defs>
      {dependencies.map((dep) => {
        const key = JSON.stringify([dep.sourceId, dep.targetId]);
        const { path, midpoint } = dependencyRoute(dep.start, dep.end);
        const active = selected === key;
        return (
          <g
            key={key}
            className="group"
            data-dependency-source={dep.sourceId}
            data-dependency-target={dep.targetId}
          >
            <path
              d={path}
              stroke="transparent"
              strokeWidth="16"
              fill="none"
              pointerEvents="stroke"
              onClick={() => setSelected(active ? null : key)}
            />
            <path
              data-dependency-path="true"
              d={path}
              stroke="#64748b"
              strokeWidth="1.75"
              strokeLinejoin="miter"
              fill="none"
              pointerEvents="none"
              markerEnd={`url(#${markerId})`}
            />
            {onRemoveDependency && (
              <g
                role="button"
                tabIndex={0}
                aria-label={`Remove dependency from ${dep.sourceId} to ${dep.targetId}`}
                className={`${active ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 focus:opacity-100 cursor-pointer transition-opacity`}
                style={{ pointerEvents: 'auto' }}
                onClick={(event) => {
                  event.stopPropagation();
                  onRemoveDependency(dep.sourceId, dep.targetId);
                  setSelected(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onRemoveDependency(dep.sourceId, dep.targetId);
                    setSelected(null);
                  }
                }}
              >
                <title>Remove dependency</title>
                <circle cx={midpoint.x} cy={midpoint.y} r="14" fill="transparent" />
                <circle
                  cx={midpoint.x}
                  cy={midpoint.y}
                  r="9"
                  className="fill-white dark:fill-gray-800"
                  stroke="#64748b"
                />
                <path
                  d={`M ${midpoint.x - 3} ${midpoint.y - 3} l 6 6 M ${midpoint.x + 3} ${midpoint.y - 3} l -6 6`}
                  stroke="#64748b"
                  strokeWidth="1.5"
                  pointerEvents="none"
                />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
