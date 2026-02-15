'use client';

import { useMemo } from 'react';
import type { Match, Round, Team } from '@/lib/db/schema';
import { MatchCard } from './match-card';

// ── Tree data structure ──

export interface MatchNode {
  match: Match;
  feeders: MatchNode[];
}

/**
 * Build a tree rooted at `rootMatchId` by walking `nextMatchId` links backwards.
 */
export function buildMatchTree(
  matches: Match[],
  rootMatchId: string
): MatchNode | null {
  const byId = new Map<string, Match>();
  const childrenOf = new Map<string, Match[]>();

  for (const m of matches) {
    byId.set(m.id, m);
    if (m.nextMatchId) {
      const siblings = childrenOf.get(m.nextMatchId) ?? [];
      siblings.push(m);
      childrenOf.set(m.nextMatchId, siblings);
    }
  }

  const root = byId.get(rootMatchId);
  if (!root) return null;

  function build(match: Match): MatchNode {
    const kids = (childrenOf.get(match.id) ?? []).sort(
      (a, b) => a.matchNumber - b.matchNumber
    );
    return { match, feeders: kids.map(build) };
  }

  return build(root);
}

/** Compute depth of a tree (number of levels). */
function treeDepth(node: MatchNode): number {
  if (node.feeders.length === 0) return 1;
  return 1 + Math.max(...node.feeders.map(treeDepth));
}

// ── Layout constants ──

const CARD_W = 208; // w-52 = 13rem = 208px
const CONNECTOR_W = 32; // horizontal connector width
const OUTPUT_W = 16; // output line to match card
const GAP = 24; // vertical gap between sibling feeders
const COL_W = CARD_W + CONNECTOR_W + OUTPUT_W; // full column width

// ── MatchTreeView (public entry point) ──

interface MatchTreeViewProps {
  allMatches: Match[];
  root: MatchNode;
  rounds: Round[];
  teams: Record<string, Team>;
  onMatchClick?: (match: Match) => void;
  isAdmin: boolean;
}

export function MatchTreeView({
  allMatches,
  root,
  rounds,
  teams,
  onMatchClick,
  isAdmin,
}: MatchTreeViewProps) {
  const depth = useMemo(() => treeDepth(root), [root]);

  // Show the last `depth` rounds as column headers
  const headerRounds = useMemo(() => {
    const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
    return sorted.slice(sorted.length - depth);
  }, [rounds, depth]);

  return (
    <div className="inline-flex flex-col">
      {/* Round headers */}
      <div className="flex">
        {headerRounds.map((r, i) => (
          <div
            key={r.id}
            className="shrink-0 text-center text-sm font-semibold text-foreground"
            style={{
              width: CARD_W,
              marginRight: i < headerRounds.length - 1 ? CONNECTOR_W + OUTPUT_W : 0,
            }}
          >
            {r.name}
          </div>
        ))}
      </div>

      {/* Tree body */}
      <div className="mt-4">
        <TreeNode
          node={root}
          depth={depth}
          allMatches={allMatches}
          teams={teams}
          onMatchClick={onMatchClick}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}

// ── Recursive TreeNode ──

interface TreeNodeProps {
  node: MatchNode;
  /** Expected subtree depth — used to left-pad shallow leaves so columns align. */
  depth: number;
  allMatches: Match[];
  teams: Record<string, Team>;
  onMatchClick?: (match: Match) => void;
  isAdmin: boolean;
}

function TreeNode({
  node,
  depth,
  allMatches,
  teams,
  onMatchClick,
  isAdmin,
}: TreeNodeProps) {
  const { match, feeders } = node;

  // ── Leaf node ──
  if (feeders.length === 0) {
    // Pad left so this card aligns to the correct round column
    const padLeft = (depth - 1) * COL_W;
    return (
      <div className="flex items-center" style={padLeft > 0 ? { marginLeft: padLeft } : undefined}>
        <div className="w-52">
          <MatchCard
            match={match}
            teams={teams}
            allMatches={allMatches}
            onClick={onMatchClick}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    );
  }

  // ── Non-leaf node ──
  return (
    <div className="flex items-stretch">
      {/* Feeder subtrees with connector segments */}
      <div className="flex flex-col">
        {feeders.map((feeder, i) => (
          <div
            key={feeder.match.id}
            className="flex items-stretch"
            style={i > 0 ? { marginTop: GAP } : undefined}
          >
            {/* Recursive subtree */}
            <TreeNode
              node={feeder}
              depth={depth - 1}
              allMatches={allMatches}
              teams={teams}
              onMatchClick={onMatchClick}
              isAdmin={isAdmin}
            />

            {/* Connector segment for this feeder */}
            <div className="relative shrink-0" style={{ width: CONNECTOR_W }}>
              {/* Horizontal line at vertical center of this feeder row */}
              <div
                className="absolute left-0 right-0 bg-border"
                style={{ top: '50%', height: 2, transform: 'translateY(-1px)' }}
              />

              {/* Vertical bar segments — only when more than one feeder */}
              {feeders.length > 1 && i === 0 && (
                // Top feeder: vertical line from center down, extending into gap
                <div
                  className="absolute bg-border"
                  style={{
                    right: 0,
                    width: 2,
                    top: '50%',
                    bottom: -(GAP / 2),
                    transform: 'translateX(-1px)',
                  }}
                />
              )}
              {feeders.length > 1 && i === feeders.length - 1 && (
                // Bottom feeder: vertical line from gap above to center
                <div
                  className="absolute bg-border"
                  style={{
                    right: 0,
                    width: 2,
                    top: -(GAP / 2),
                    bottom: '50%',
                    transform: 'translateX(-1px)',
                  }}
                />
              )}
              {feeders.length > 1 && i > 0 && i < feeders.length - 1 && (
                // Middle feeder: vertical line spanning full row + gaps
                <div
                  className="absolute bg-border"
                  style={{
                    right: 0,
                    width: 2,
                    top: -(GAP / 2),
                    bottom: -(GAP / 2),
                    transform: 'translateX(-1px)',
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Output line → this match card (vertically centered) */}
      <div className="flex items-center">
        <div className="shrink-0 bg-border" style={{ width: OUTPUT_W, height: 2 }} />
        <div className="w-52">
          <MatchCard
            match={match}
            teams={teams}
            allMatches={allMatches}
            onClick={onMatchClick}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </div>
  );
}
