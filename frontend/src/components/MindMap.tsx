import { useRef, useEffect } from 'react';
import { Transformer } from 'markmap-lib';
import { Markmap } from 'markmap-view';

interface MindMapProps {
  topic: string;
  sections: { title: string; narration_text: string }[];
  concepts?: string[];
}

const transformer = new Transformer();

// Color palette for branches — each section gets a distinct color
const BRANCH_COLORS = [
  '#1e3a2f', // forest
  '#c8963e', // gold
  '#2563eb', // blue
  '#9333ea', // purple
  '#dc2626', // red
  '#0891b2', // cyan
  '#ea580c', // orange
  '#16a34a', // green
];

function extractKeywords(narration: string, max = 4): string[] {
  // Pull short phrases from narration for subtopics
  const sentences = narration.split(/[.!?]+/).filter(s => s.trim().length > 10);
  return sentences.slice(0, max).map(s => {
    const words = s.trim().split(/\s+/);
    // Take first 4-6 meaningful words
    return words.slice(0, 6).join(' ').replace(/^[,;:\s]+|[,;:\s]+$/g, '');
  }).filter(Boolean);
}

export default function MindMap({ topic, sections, concepts }: MindMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const markmapRef = useRef<Markmap | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Build a rich markdown tree
    let md = `# ${topic}\n`;

    for (const sec of sections) {
      md += `## ${sec.title}\n`;
      // Add key points from narration as sub-branches
      const keywords = extractKeywords(sec.narration_text, 3);
      for (const kw of keywords) {
        md += `- ${kw}\n`;
      }
    }

    if (concepts && concepts.length > 0) {
      md += `## Key Concepts\n`;
      for (const c of concepts) {
        md += `- ${c}\n`;
      }
    }

    const { root } = transformer.transform(md);

    // Assign distinct colors to each top-level branch and its descendants
    function colorize(node: { children?: typeof root.children; payload?: Record<string, unknown> }, branchIdx?: number, depth = 0) {
      if (!node.payload) node.payload = {};
      if (depth === 0) {
        // Root node
        node.payload.fold = 0; // keep expanded
      } else if (depth === 1) {
        // Top-level branch — assign unique color
        branchIdx = branchIdx ?? 0;
      }
      if (branchIdx !== undefined) {
        const color = BRANCH_COLORS[branchIdx % BRANCH_COLORS.length];
        (node.payload as Record<string, unknown>).color = color;
      }
      if (node.children) {
        node.children.forEach((child, i) => {
          colorize(child, depth === 0 ? i : branchIdx, depth + 1);
        });
      }
    }
    colorize(root);

    if (!markmapRef.current) {
      markmapRef.current = Markmap.create(svgRef.current, {
        paddingX: 20,
        autoFit: true,
        duration: 500,
        maxWidth: 300,
        colorFreezeLevel: 2,
      }, root);
    } else {
      markmapRef.current.setData(root);
      markmapRef.current.fit();
    }
  }, [topic, sections, concepts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (markmapRef.current) {
        markmapRef.current.destroy();
        markmapRef.current = null;
      }
    };
  }, []);

  return (
    <div
      className="mindmap-container"
      style={{
        width: '100%',
        minHeight: 500,
        height: 'calc(100vh - 180px)',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <style>{`
        .mindmap-container .markmap-node text {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 14px;
        }
        .mindmap-container .markmap-node[data-depth="0"] text {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 700;
        }
        .mindmap-container .markmap-node[data-depth="1"] text {
          font-size: 15px;
          font-weight: 600;
        }
        .mindmap-container .markmap-node[data-depth="2"] text {
          font-size: 12px;
          font-weight: 400;
          fill: #666;
        }
        .mindmap-container .markmap-link {
          stroke-width: 2;
        }
        .mindmap-container .markmap-node circle {
          r: 4;
        }
        .mindmap-container .markmap-node[data-depth="0"] circle {
          r: 6;
        }
      `}</style>
      <svg
        ref={svgRef}
        style={{ width: '100%', height: '100%', minHeight: 500 }}
      />
    </div>
  );
}
