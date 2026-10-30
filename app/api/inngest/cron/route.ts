import { NextRequest, NextResponse } from 'next/server';
import { computeNextRunAt, isRoutineDue, simulateRoutineExecutionSteps } from '@/lib/orbit-logic';
import { DEMO_AGENTS, DEMO_ROUTINES } from '@/lib/seed-data';
import { AgentConfig, AgentRoutine, RoutineExecution } from '@/lib/types';

export async function GET() {
  const nowMs = Date.now();
  const allRoutines = Object.values(DEMO_ROUTINES).flat();
  const dueList = allRoutines.filter((r) => isRoutineDue(r, nowMs));

  return NextResponse.json({
    status: 'ok',
    checkedAt: new Date(nowMs).toISOString(),
    activeRoutinesCount: allRoutines.filter((r) => r.isActive).length,
    dueRoutinesCount: dueList.length,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const agents: AgentConfig[] = Array.isArray(body.agents) ? body.agents : DEMO_AGENTS;
    const routinesByAgent: Record<string, AgentRoutine[]> =
      body.routinesByAgent || DEMO_ROUTINES;
    const locale = body.locale || 'fr';

    const nowMs = Date.now();
    const triggeredExecutions: {
      agentId: string;
      routineId: string;
      execution: RoutineExecution;
      nextRunAt: string;
      lastRunAt: string;
    }[] = [];

    for (const agent of agents) {
      if (!agent.isActive) continue;
      const agentRoutines = routinesByAgent[agent.agentId] || [];
      for (const routine of agentRoutines) {
        if (isRoutineDue(routine, nowMs)) {
          const startedAt = new Date().toISOString();
          const { steps, summary } = simulateRoutineExecutionSteps(routine, agent, locale);
          const completedAt = new Date().toISOString();
          const nextRunAt = computeNextRunAt(
            routine.frequency,
            routine.time,
            routine.days,
            new Date()
          );

          triggeredExecutions.push({
            agentId: agent.agentId,
            routineId: routine.routineId,
            execution: {
              executionId: `exec_cron_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              routineId: routine.routineId,
              routineName: routine.name,
              agentId: agent.agentId,
              ownerId: agent.ownerId,
              status: 'completed',
              triggerType: 'scheduled',
              summary,
              stepsLog: steps,
              startedAt,
              completedAt,
              createdAt: completedAt,
            },
            nextRunAt,
            lastRunAt: completedAt,
          });
        }
      }
    }

    return NextResponse.json({
      status: 'completed',
      checkedAt: new Date(nowMs).toISOString(),
      triggeredCount: triggeredExecutions.length,
      triggeredExecutions,
    });
  } catch (error) {
    console.error('Cron tick error:', error);
    return NextResponse.json(
      { error: 'Failed to process scheduled routines tick.' },
      { status: 500 }
    );
  }
}
