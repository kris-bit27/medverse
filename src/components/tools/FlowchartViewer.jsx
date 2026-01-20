import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, Circle, Square, Diamond, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const nodeStyles = {
  start: {
    bg: 'bg-teal-100 dark:bg-teal-900/30',
    border: 'border-teal-300 dark:border-teal-700',
    text: 'text-teal-800 dark:text-teal-200',
    icon: Circle
  },
  step: {
    bg: 'bg-white dark:bg-slate-800',
    border: 'border-slate-300 dark:border-slate-600',
    text: 'text-slate-800 dark:text-slate-200',
    icon: Square
  },
  decision: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-300 dark:border-amber-700',
    text: 'text-amber-800 dark:text-amber-200',
    icon: Diamond
  },
  end: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    border: 'border-emerald-300 dark:border-emerald-700',
    text: 'text-emerald-800 dark:text-emerald-200',
    icon: CheckCircle2
  }
};

function FlowNode({ node, edges, allNodes, onNavigate, isActive, isVisited }) {
  const style = nodeStyles[node.type] || nodeStyles.step;
  const Icon = style.icon;
  const outgoingEdges = edges.filter(e => e.from === node.id);
  const isDecision = node.type === 'decision';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative",
        isVisited && !isActive && "opacity-60"
      )}
    >
      <div
        className={cn(
          "p-4 rounded-xl border-2 transition-all",
          style.bg,
          style.border,
          isActive && "ring-2 ring-teal-500 ring-offset-2 dark:ring-offset-slate-950",
          isDecision && "rounded-2xl"
        )}
      >
        <div className="flex items-start gap-3">
          <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", style.text)} />
          <div className="flex-1">
            <h4 className={cn("font-semibold mb-1", style.text)}>
              {node.title}
            </h4>
            {node.text && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {node.text}
              </p>
            )}
          </div>
        </div>

        {/* Decision buttons */}
        {isActive && isDecision && outgoingEdges.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {outgoingEdges.map((edge, i) => {
              const targetNode = allNodes.find(n => n.id === edge.to);
              return (
                <Button
                  key={i}
                  size="sm"
                  variant={edge.label?.toLowerCase().includes('ano') || edge.label?.toLowerCase().includes('yes') ? 'default' : 'outline'}
                  onClick={() => onNavigate(edge.to)}
                  className={cn(
                    edge.label?.toLowerCase().includes('ano') || edge.label?.toLowerCase().includes('yes')
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : ''
                  )}
                >
                  {edge.label || `→ ${targetNode?.title || 'Další'}`}
                </Button>
              );
            })}
          </div>
        )}

        {/* Non-decision continue button */}
        {isActive && !isDecision && outgoingEdges.length > 0 && (
          <div className="mt-4">
            <Button
              size="sm"
              onClick={() => onNavigate(outgoingEdges[0].to)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              Pokračovat
              <ChevronDown className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* Arrow to next */}
      {!isActive && outgoingEdges.length > 0 && !isDecision && (
        <div className="flex justify-center py-2">
          <ChevronDown className="w-5 h-5 text-slate-400" />
        </div>
      )}
    </motion.div>
  );
}

export default function FlowchartViewer({ nodes = [], edges = [] }) {
  const [visitedNodes, setVisitedNodes] = useState([]);
  const [currentNodeId, setCurrentNodeId] = useState(null);

  // Find start node
  const startNode = useMemo(() => {
    return nodes.find(n => n.type === 'start') || nodes[0];
  }, [nodes]);

  // Initialize
  React.useEffect(() => {
    if (startNode && !currentNodeId) {
      setCurrentNodeId(startNode.id);
      setVisitedNodes([startNode.id]);
    }
  }, [startNode]);

  const handleNavigate = (nodeId) => {
    setCurrentNodeId(nodeId);
    setVisitedNodes(prev => [...prev, nodeId]);
  };

  const handleReset = () => {
    setCurrentNodeId(startNode?.id);
    setVisitedNodes([startNode?.id]);
  };

  // Build visible path
  const visibleNodes = useMemo(() => {
    return visitedNodes.map(id => nodes.find(n => n.id === id)).filter(Boolean);
  }, [visitedNodes, nodes]);

  if (!nodes.length) {
    return (
      <Card className="p-8 text-center">
        <p className="text-slate-500">Algoritmus nemá žádné kroky</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleReset}>
          Začít znovu
        </Button>
      </div>

      {/* Flowchart */}
      <div className="space-y-2">
        <AnimatePresence>
          {visibleNodes.map((node, i) => (
            <FlowNode
              key={node.id}
              node={node}
              edges={edges}
              allNodes={nodes}
              onNavigate={handleNavigate}
              isActive={node.id === currentNodeId}
              isVisited={i < visibleNodes.length - 1}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* End state */}
      {currentNodeId && nodes.find(n => n.id === currentNodeId)?.type === 'end' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl text-center"
        >
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-600" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Algoritmus dokončen
          </h3>
          <Button onClick={handleReset} variant="outline" className="mt-2">
            Projít znovu
          </Button>
        </motion.div>
      )}
    </div>
  );
}