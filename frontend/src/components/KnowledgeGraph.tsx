import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import ForceGraph2D, { type ForceGraphMethods, type NodeObject } from 'react-force-graph-2d';

interface SessionInput {
  id: number;
  topic: string;
  status: string;
  concepts_learned?: string[];
}

interface GraphNode {
  id: string;
  name: string;
  group: 'topic' | 'concept';
  val: number;
}

interface GraphLink {
  source: string;
  target: string;
}

interface KnowledgeGraphProps {
  sessions: SessionInput[];
}

export default function KnowledgeGraph({ sessions }: KnowledgeGraphProps) {
  const fgRef = useRef<ForceGraphMethods<NodeObject<GraphNode>> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  // Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setDimensions({ width, height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Build graph data
  const graphData = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const conceptSet = new Map<string, string>(); // concept name -> node id

    for (const session of sessions) {
      const topicId = `topic-${session.id}`;
      nodes.push({
        id: topicId,
        name: session.topic,
        group: 'topic',
        val: 12,
      });

      if (session.concepts_learned) {
        for (const concept of session.concepts_learned) {
          const conceptKey = concept.toLowerCase().trim();
          let conceptId = conceptSet.get(conceptKey);
          if (!conceptId) {
            conceptId = `concept-${conceptKey}`;
            conceptSet.set(conceptKey, conceptId);
            nodes.push({
              id: conceptId,
              name: concept,
              group: 'concept',
              val: 5,
            });
          }
          links.push({ source: topicId, target: conceptId });
        }
      }
    }

    return { nodes, links };
  }, [sessions]);

  // Build adjacency for hover highlighting
  const adjacency = useMemo(() => {
    const adj = new Map<string, Set<string>>();
    for (const link of graphData.links) {
      const s = typeof link.source === 'string' ? link.source : (link.source as { id?: string }).id ?? '';
      const t = typeof link.target === 'string' ? link.target : (link.target as { id?: string }).id ?? '';
      if (!adj.has(s)) adj.set(s, new Set());
      if (!adj.has(t)) adj.set(t, new Set());
      adj.get(s)!.add(t);
      adj.get(t)!.add(s);
    }
    return adj;
  }, [graphData]);

  const isConnected = useCallback(
    (nodeId: string) => {
      if (!hoveredNode) return true;
      if (nodeId === hoveredNode) return true;
      return adjacency.get(hoveredNode)?.has(nodeId) ?? false;
    },
    [hoveredNode, adjacency],
  );

  const handleNodeHover = useCallback((node: NodeObject<GraphNode> | null) => {
    setHoveredNode(node?.id as string ?? null);
  }, []);

  const handleEngineStop = useCallback(() => {
    fgRef.current?.zoomToFit(400, 40);
  }, []);

  // Resolve CSS variables once for canvas rendering
  const colors = useMemo(() => {
    const root = document.documentElement;
    const cs = getComputedStyle(root);
    return {
      forest: cs.getPropertyValue('--forest').trim() || '#1e3a2f',
      gold: cs.getPropertyValue('--gold').trim() || '#c8963e',
      bg: cs.getPropertyValue('--bg').trim() || '#fdf8f0',
      muted: cs.getPropertyValue('--muted').trim() || '#8a8a7a',
    };
  }, []);

  const nodeCanvasObject = useCallback(
    (node: NodeObject<GraphNode>, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const isTopic = node.group === 'topic';
      const radius = isTopic ? 8 : 4.5;
      const connected = isConnected(node.id as string);
      const alpha = connected ? 1.0 : 0.15;

      // Glow for hovered node
      if (node.id === hoveredNode) {
        ctx.beginPath();
        ctx.arc(x, y, radius + 4, 0, 2 * Math.PI);
        ctx.fillStyle = isTopic
          ? `rgba(30,58,47,0.15)`
          : `rgba(200,150,62,0.15)`;
        ctx.fill();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = isTopic ? colors.forest : colors.gold;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Label
      const fontSize = isTopic ? 12 / globalScale : 10 / globalScale;
      ctx.font = `${isTopic ? '600' : '400'} ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.globalAlpha = alpha;
      ctx.fillStyle = isTopic ? colors.forest : colors.muted;

      // Truncate long labels
      const maxChars = isTopic ? 30 : 20;
      const label =
        (node.name ?? '').length > maxChars
          ? (node.name ?? '').slice(0, maxChars - 1) + '\u2026'
          : (node.name ?? '');
      ctx.fillText(label, x, y + radius + 2);
      ctx.globalAlpha = 1;
    },
    [hoveredNode, isConnected, colors],
  );

  const nodePointerAreaPaint = useCallback(
    (node: NodeObject<GraphNode>, color: string, ctx: CanvasRenderingContext2D) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const radius = node.group === 'topic' ? 10 : 6;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    },
    [],
  );

  const linkColor = useCallback(
    (link: { source?: string | { id?: string }; target?: string | { id?: string } }) => {
      if (!hoveredNode) return 'rgba(30,58,47,0.12)';
      const s = typeof link.source === 'string' ? link.source : link.source?.id ?? '';
      const t = typeof link.target === 'string' ? link.target : link.target?.id ?? '';
      if (s === hoveredNode || t === hoveredNode) return 'rgba(30,58,47,0.4)';
      return 'rgba(30,58,47,0.05)';
    },
    [hoveredNode],
  );

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: 500,
        borderRadius: 16,
        overflow: 'hidden',
        background: colors.bg,
        border: '1px solid var(--border)',
      }}
    >
      <ForceGraph2D
        ref={fgRef as React.MutableRefObject<ForceGraphMethods<NodeObject<GraphNode>> | undefined>}
        graphData={graphData as { nodes: NodeObject<GraphNode>[]; links: { source: string; target: string }[] }}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor={colors.bg}
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={() => 'replace'}
        nodePointerAreaPaint={nodePointerAreaPaint}
        onNodeHover={handleNodeHover}
        linkColor={linkColor}
        linkWidth={1.5}
        cooldownTicks={100}
        onEngineStop={handleEngineStop}
        enableZoomInteraction={true}
        enablePanInteraction={true}
      />
    </div>
  );
}
