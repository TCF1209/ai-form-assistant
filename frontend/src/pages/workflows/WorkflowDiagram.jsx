import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Custom Start Node
const StartNode = ({ data }) => (
  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500 text-white shadow-lg border-2 border-emerald-600">
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <Handle type="source" position={Position.Right} className="!bg-emerald-600 !w-3 !h-3" />
  </div>
);

// Custom End Node
const EndNode = ({ data }) => (
  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-sky-500 text-white shadow-lg border-2 border-sky-600">
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <Handle type="target" position={Position.Left} className="!bg-sky-600 !w-3 !h-3" />
  </div>
);

// Custom Step Node
const StepNode = ({ data, selected }) => {
  const approvalModeColors = {
    'ALL': 'bg-purple-100 text-purple-700 border-purple-200',
    'MAJORITY': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'ANY': 'bg-teal-100 text-teal-700 border-teal-200'
  };

  const approvalModeLabels = {
    'ALL': 'All',
    'MAJORITY': 'Majority',
    'ANY': 'Any One'
  };

  return (
    <div
      className={`min-w-[160px] max-w-[200px] bg-white rounded-lg shadow-lg border-2 transition-all cursor-pointer ${
        selected
          ? 'border-sky-500 ring-2 ring-sky-200'
          : 'border-slate-200 hover:border-sky-300'
      }`}
      onClick={() => data.onSelect && data.onSelect(data.stepIndex)}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-400 !w-3 !h-3" />

      {/* Header with step number */}
      <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold">
            {data.stepIndex + 1}
          </span>
          <span className="text-sm font-semibold text-slate-800 truncate flex-1">
            {data.name || `Step ${data.stepIndex + 1}`}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2 space-y-2">
        {/* Approvers */}
        <div className="flex items-start gap-1.5">
          <svg className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <div className="text-xs text-slate-600 truncate flex-1">
            {data.approverNames && data.approverNames.length > 0
              ? (data.approverNames.length === 1
                  ? data.approverNames[0]
                  : `${data.approverNames.length} approvers`)
              : <span className="text-amber-500 italic">No approvers</span>
            }
          </div>
        </div>

        {/* Approval Mode Badge */}
        <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${approvalModeColors[data.approvalMode] || approvalModeColors['ALL']}`}>
          {approvalModeLabels[data.approvalMode] || 'All'}
        </div>

        {/* Time limit if exists */}
        {data.timeLimit && (
          <div className="flex items-center gap-1 text-xs text-amber-600">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {data.timeLimit}h limit
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-slate-400 !w-3 !h-3" />
    </div>
  );
};

// Parallel Approval Node (single node showing all approvers)
const ParallelApprovalNode = ({ data }) => {
  const approvalModeColors = {
    'ALL': 'bg-purple-100 text-purple-700 border-purple-300',
    'MAJORITY': 'bg-indigo-100 text-indigo-700 border-indigo-300',
    'ANY': 'bg-teal-100 text-teal-700 border-teal-300'
  };

  const approvalModeLabels = {
    'ALL': 'All Must Approve',
    'MAJORITY': 'Majority Required',
    'ANY': 'Any One Approval'
  };

  return (
    <div className="min-w-[200px] max-w-[280px] bg-white rounded-lg shadow-lg border-2 border-sky-200">
      <Handle type="target" position={Position.Left} className="!bg-sky-500 !w-3 !h-3" />

      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-sky-50 to-indigo-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="text-sm font-semibold text-slate-800">Parallel Approval</span>
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2 space-y-2">
        {/* Approvers List */}
        {data.approverNames && data.approverNames.length > 0 ? (
          <div className="space-y-1">
            {data.approverNames.slice(0, 4).map((name, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                  {name.charAt(0).toUpperCase()}
                </span>
                <span className="truncate">{name}</span>
              </div>
            ))}
            {data.approverNames.length > 4 && (
              <div className="text-xs text-slate-400 pl-7">
                +{data.approverNames.length - 4} more
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-amber-500 italic">No approvers selected</div>
        )}

        {/* Approval Mode Badge */}
        <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${approvalModeColors[data.approvalMode] || approvalModeColors['ALL']}`}>
          {approvalModeLabels[data.approvalMode] || 'All Must Approve'}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-sky-500 !w-3 !h-3" />
    </div>
  );
};

// Node types for React Flow
const nodeTypes = {
  start: StartNode,
  end: EndNode,
  step: StepNode,
  parallelApproval: ParallelApprovalNode,
};

// Default edge options
const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: true,
  style: { stroke: '#94a3b8', strokeWidth: 2 },
};

const WorkflowDiagram = ({
  steps = [],
  workflowType = 'SEQUENTIAL',
  users = [],
  onStepSelect,
  selectedStepIndex
}) => {
  // Get approver names for a step
  const getApproverNames = useCallback((step) => {
    if (step.assigned_users_detail && step.assigned_users_detail.length > 0) {
      return step.assigned_users_detail.map(u => u.full_name || u.username);
    }
    if (step.approvers && step.approvers.length > 0 && users) {
      return step.approvers.map(userId => {
        const user = users.find(u => String(u.id) === String(userId));
        return user ? (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username) : '';
      }).filter(Boolean);
    }
    if (step.assigned_user && users) {
      const user = users.find(u => String(u.id) === String(step.assigned_user));
      if (user) {
        return [user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username];
      }
    }
    return [];
  }, [users]);

  // Generate nodes and edges based on workflow type and steps
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes = [];
    const edges = [];

    const nodeSpacingX = 220;
    const nodeSpacingY = 120;
    const startX = 50;
    const centerY = 150;

    if (workflowType === 'SEQUENTIAL') {
      // Sequential: Start → Step1 → Step2 → ... → End
      nodes.push({
        id: 'start',
        type: 'start',
        position: { x: startX, y: centerY },
        data: { label: 'Start' },
      });

      steps.forEach((step, index) => {
        const nodeId = `step-${index}`;
        nodes.push({
          id: nodeId,
          type: 'step',
          position: { x: startX + nodeSpacingX * (index + 1), y: centerY - 30 },
          data: {
            name: step.name,
            stepIndex: index,
            approverNames: getApproverNames(step),
            approvalMode: step.approval_mode || 'ALL',
            timeLimit: step.time_limit_hours,
            onSelect: onStepSelect,
          },
          selected: selectedStepIndex === index,
        });

        // Connect to previous node
        const sourceId = index === 0 ? 'start' : `step-${index - 1}`;
        edges.push({
          id: `edge-${sourceId}-${nodeId}`,
          source: sourceId,
          target: nodeId,
        });
      });

      // Add end node
      const endX = startX + nodeSpacingX * (steps.length + 1);
      nodes.push({
        id: 'end',
        type: 'end',
        position: { x: endX, y: centerY },
        data: { label: 'End' },
      });

      // Connect last step to end
      if (steps.length > 0) {
        edges.push({
          id: `edge-step-${steps.length - 1}-end`,
          source: `step-${steps.length - 1}`,
          target: 'end',
        });
      } else {
        edges.push({
          id: 'edge-start-end',
          source: 'start',
          target: 'end',
        });
      }
    } else if (workflowType === 'PARALLEL') {
      // Parallel: Start → [Single Parallel Approval Node] → End
      // For PARALLEL, we show a single node with all approvers from the first step
      const parallelStep = steps[0];

      // Calculate vertical center based on the parallel approval node height
      const approverCount = parallelStep ? Math.min(getApproverNames(parallelStep).length, 4) : 0;
      const parallelNodeHeight = 80 + approverCount * 24;
      const verticalCenter = centerY;

      nodes.push({
        id: 'start',
        type: 'start',
        position: { x: startX, y: verticalCenter - 24 }, // Center the 48px circle
        data: { label: 'Start' },
      });

      if (parallelStep) {
        nodes.push({
          id: 'parallel-approval',
          type: 'parallelApproval',
          position: { x: startX + nodeSpacingX, y: verticalCenter - parallelNodeHeight / 2 },
          data: {
            approverNames: getApproverNames(parallelStep),
            approvalMode: parallelStep.approval_mode || 'ALL',
          },
        });

        edges.push({
          id: 'edge-start-parallel',
          source: 'start',
          target: 'parallel-approval',
          type: 'straight',
        });

        // Add end node
        const endX = startX + nodeSpacingX * 2;
        nodes.push({
          id: 'end',
          type: 'end',
          position: { x: endX, y: verticalCenter - 24 }, // Center the 48px circle
          data: { label: 'End' },
        });

        edges.push({
          id: 'edge-parallel-end',
          source: 'parallel-approval',
          target: 'end',
          type: 'straight',
        });
      } else {
        // No steps yet, just show start → end
        const endX = startX + nodeSpacingX;
        nodes.push({
          id: 'end',
          type: 'end',
          position: { x: endX, y: verticalCenter - 24 },
          data: { label: 'End' },
        });

        edges.push({
          id: 'edge-start-end',
          source: 'start',
          target: 'end',
          type: 'straight',
        });
      }
    } else {
      // HYBRID or CONDITIONAL - for now, show as sequential
      // This can be enhanced later for more complex visualizations
      nodes.push({
        id: 'start',
        type: 'start',
        position: { x: startX, y: centerY },
        data: { label: 'Start' },
      });

      steps.forEach((step, index) => {
        const nodeId = `step-${index}`;
        nodes.push({
          id: nodeId,
          type: 'step',
          position: { x: startX + nodeSpacingX * (index + 1), y: centerY - 30 },
          data: {
            name: step.name,
            stepIndex: index,
            approverNames: getApproverNames(step),
            approvalMode: step.approval_mode || 'ALL',
            timeLimit: step.time_limit_hours,
            onSelect: onStepSelect,
          },
          selected: selectedStepIndex === index,
        });

        const sourceId = index === 0 ? 'start' : `step-${index - 1}`;
        edges.push({
          id: `edge-${sourceId}-${nodeId}`,
          source: sourceId,
          target: nodeId,
        });
      });

      const endX = startX + nodeSpacingX * (steps.length + 1);
      nodes.push({
        id: 'end',
        type: 'end',
        position: { x: endX, y: centerY },
        data: { label: 'End' },
      });

      if (steps.length > 0) {
        edges.push({
          id: `edge-step-${steps.length - 1}-end`,
          source: `step-${steps.length - 1}`,
          target: 'end',
        });
      } else {
        edges.push({
          id: 'edge-start-end',
          source: 'start',
          target: 'end',
        });
      }
    }

    return { initialNodes: nodes, initialEdges: edges };
  }, [steps, workflowType, getApproverNames, onStepSelect, selectedStepIndex]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when steps change
  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Calculate diagram width based on steps
  const diagramWidth = useMemo(() => {
    if (workflowType === 'PARALLEL') {
      return Math.max(500, 220 * 3); // Start + Steps + End
    }
    return Math.max(500, 220 * (steps.length + 2)); // Start + all steps + End
  }, [steps.length, workflowType]);

  // Calculate diagram height based on workflow type
  const diagramHeight = useMemo(() => {
    if (workflowType === 'PARALLEL') {
      // Single parallel approval node - need more height for approver list
      const approverCount = steps[0]?.approvers?.length || 0;
      return Math.max(220, 180 + Math.min(approverCount, 4) * 24);
    }
    return 200;
  }, [steps, workflowType]);

  if (steps.length === 0 || (workflowType === 'PARALLEL' && (!steps[0]?.approvers || steps[0]?.approvers.length === 0))) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
        <div className="flex items-center justify-center gap-4 text-slate-400">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            </svg>
          </div>
          <div className="h-0.5 w-16 bg-slate-200"></div>
          {workflowType === 'PARALLEL' ? (
            <div className="w-12 h-12 rounded-lg bg-slate-200 animate-pulse flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          ) : (
            <div className="w-8 h-8 rounded bg-slate-200 animate-pulse"></div>
          )}
          <div className="h-0.5 w-16 bg-slate-200"></div>
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-4">
          {workflowType === 'PARALLEL'
            ? 'Add approvers to see the workflow diagram'
            : 'Add steps to see the workflow diagram'}
        </p>
      </div>
    );
  }

  return (
    <div
      className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-lg overflow-hidden"
      style={{ height: diagramHeight }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnDrag={true}
        zoomOnScroll={true}
        minZoom={0.5}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#cbd5e1" gap={16} size={1} />
        <Controls
          showInteractive={false}
          className="!bg-white !border-slate-200 !shadow-md"
        />
      </ReactFlow>
    </div>
  );
};

export default WorkflowDiagram;
