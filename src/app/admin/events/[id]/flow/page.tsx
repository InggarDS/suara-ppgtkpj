import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EventHeader from "../event-header";
import StageRulesPanel from "./stage-rules-panel";
import AddStageButton from "./add-stage-button";
import CandidateEditor from "./candidate-editor";
import StartStageButton from "./start-stage-button";

export const dynamic = "force-dynamic";

export default async function FlowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      stages: {
        orderBy: { order: "asc" },
        include: { candidates: { orderBy: { order: "asc" } }, _count: { select: { votes: true } } },
      },
    },
  });
  if (!event) notFound();

  const liveStage = event.stages.find((s) => s.status === "LIVE");
  const focusStage = liveStage ?? event.stages.find((s) => s.status === "NOT_STARTED");
  const participantCount = await prisma.participant.count({ where: { eventId: id } });
  const registeredParticipants = await prisma.participant.findMany({
    where: { eventId: id, registeredAt: { not: null } },
    select: { id: true, name: true, jemaat: true },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <EventHeader
        eventId={event.id}
        title="Voting flow"
        subtitle="Stages run in order. A gate holds the next stage until its threshold is met."
        status={event.status}
      />
      <div className="flex-1 px-8 pt-6.5 pb-10 bg-paper">
        <div className="grid gap-6 items-start" style={{ gridTemplateColumns: "minmax(0,1fr) 300px" }}>
          <div
            className="bg-card border border-border-1 rounded-xl p-6.5"
            style={{ backgroundImage: "radial-gradient(#EDEAE3 1px,transparent 1px)", backgroundSize: "18px 18px" }}
          >
            <div className="flex flex-col">
              {event.stages.map((stage, i) => {
                const prev = event.stages[i - 1];
                return (
                  <div key={stage.id}>
                    {i > 0 && (
                      <div className="flex items-stretch gap-3.5 pl-[30px]">
                        <div className="w-0.5 bg-border-2 h-8.5" />
                      </div>
                    )}
                    {i > 0 && prev && prev.status !== "NOT_STARTED" && (
                      <div className="bg-amber-bg border-[1.5px] border-dashed border-amber-border rounded-[11px] px-4.5 py-3.5 flex items-center gap-3.5 mb-0">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B5761F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 3 3 7v6c0 5 3.8 8.4 9 9 5.2-.6 9-4 9-9V7l-9-4Z"></path>
                        </svg>
                        <div className="flex-1">
                          <div className="text-[13px] font-semibold text-amber-text">Transition gate</div>
                          <div className="text-xs text-amber-sub leading-relaxed">
                            Auto-advance when ≥ {prev.thresholdMin} of {event.expectedParticipants || participantCount} participants have voted
                            {prev.status === "COMPLETED" && (
                              <>
                                {" "}
                                · <strong className="text-amber-text">threshold met at {prev._count.votes}</strong>
                              </>
                            )}
                          </div>
                        </div>
                        <span className="font-mono text-[10.5px] bg-amber-chip text-amber-text rounded px-2 py-1.5">
                          {prev.status === "COMPLETED" ? "PASSED" : "WAITING"}
                        </span>
                      </div>
                    )}
                    {i > 0 && <div className="flex items-stretch gap-3.5 pl-[30px]"><div className="w-0.5 bg-border-2 h-8.5" /></div>}

                    <div
                      className={`bg-white rounded-[11px] px-4.5 py-4 ${
                        stage.status === "LIVE" ? "border-[1.5px] border-brand shadow-sm" : "border-[1.5px] border-border-1"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <span
                          className={`font-mono text-[10px] rounded px-1.5 py-1 ${
                            stage.status === "LIVE" ? "bg-brand text-white" : "bg-brand-soft text-brand"
                          }`}
                        >
                          STAGE {stage.order}
                        </span>
                        <span className="text-sm font-semibold text-ink">{stage.name}</span>
                        <span className="flex-1" />
                        {stage.status === "LIVE" && (
                          <span className="flex items-center gap-1.5 text-[11.5px] text-brand font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse-dot" />
                            Live now
                          </span>
                        )}
                        {stage.status === "COMPLETED" && <span className="text-[11.5px] text-brand-accent font-medium">Completed</span>}
                        {stage.status === "NOT_STARTED" && <StartStageButton eventId={event.id} stageId={stage.id} />}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {stage.candidates.map((c) => (
                          <span
                            key={c.id}
                            className={`text-xs rounded-full px-2.5 py-1.5 border ${
                              stage.status === "NOT_STARTED"
                                ? "text-ink-soft bg-border-5 border-border-3"
                                : "text-ink bg-brand-soft border-brand-soft-border"
                            }`}
                          >
                            {c.name}
                          </span>
                        ))}
                      </div>
                      {stage.status === "NOT_STARTED" && (
                        <CandidateEditor
                          eventId={event.id}
                          stageId={stage.id}
                          candidates={stage.candidates}
                          participants={registeredParticipants}
                        />
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="flex items-stretch gap-3.5 pl-[30px]">
                <div className="w-0.5 bg-border-2 h-8.5" />
              </div>
              <AddStageButton eventId={event.id} />
            </div>
          </div>

          <div className="sticky top-5">
            {focusStage ? (
              <StageRulesPanel eventId={event.id} stage={focusStage} />
            ) : (
              <div className="bg-card border border-border-1 rounded-xl p-4.5">
                <div className="text-[13px] font-semibold text-ink mb-1">All stages completed</div>
                <div className="text-[11.5px] text-faint">Add another stage to keep the flow going.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
