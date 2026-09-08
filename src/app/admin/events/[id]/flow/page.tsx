import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EventHeader from "../event-header";
import StageRulesPanel from "./stage-rules-panel";
import AddStageButton from "./add-stage-button";
import CandidateEditor from "./candidate-editor";
import StageControls from "./stage-controls";
import PromoteCandidateButton from "./promote-candidate-button";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: "Not started",
  CHECK_IN: "Check-in open",
  VOTING: "Voting live",
  STOPPED: "Stopped",
  CLOSED: "Closed",
};

export default async function FlowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      stages: {
        orderBy: { order: "asc" },
        include: {
          candidates: { orderBy: { order: "asc" } },
          _count: { select: { votes: true, checkIns: true } },
        },
      },
    },
  });
  if (!event) notFound();

  const activeStage = event.stages.find((s) => s.status === "CHECK_IN" || s.status === "VOTING");
  const focusStage = activeStage ?? event.stages.find((s) => s.status === "NOT_STARTED") ?? event.stages[0];
  const multiStage = event.stages.length > 1;
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
        subtitle="Every stage is under manual control: open it for check-in, start voting, stop, restart, then open the result."
        status={event.status}
      />
      <div className="flex-1 min-h-0 overflow-y-auto px-8 pt-6.5 pb-10 bg-paper">
        <div className="grid gap-6 items-start" style={{ gridTemplateColumns: "minmax(0,1fr) 320px" }}>
          <div
            className="bg-card border border-border-1 rounded-xl p-6.5"
            style={{ backgroundImage: "radial-gradient(rgba(27,77,228,.07) 1px,transparent 1px)", backgroundSize: "18px 18px" }}
          >
            <div className="flex flex-col">
              {event.stages.map((stage, i) => {
                const live = stage.status === "VOTING" || stage.status === "CHECK_IN";
                const nextStage = event.stages[i + 1];
                return (
                  <div key={stage.id}>
                    {i > 0 && (
                      <div className="flex items-stretch gap-3.5 pl-[30px]">
                        <div className="w-0.5 bg-border-2 h-8.5" />
                      </div>
                    )}

                    <div
                      className={`bg-card rounded-[20px] px-4.5 py-4 ${
                        live ? "border-[1.5px] border-brand shadow-sm" : "border-[1.5px] border-border-1"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                        <span
                          className={`font-mono text-[10px] rounded px-1.5 py-1 ${
                            live ? "bg-brand text-white" : "bg-brand-soft text-brand"
                          }`}
                        >
                          STAGE {stage.order}
                        </span>
                        <span className="text-sm font-semibold text-ink">{stage.name}</span>
                        {stage.resultsOpen && (
                          <span className="font-mono text-[9px] tracking-[.06em] uppercase text-brand bg-brand-soft rounded px-1.5 py-0.5">
                            Result open
                          </span>
                        )}
                        <span className="flex-1" />
                        <span className="text-[11.5px] font-medium text-faint">{STATUS_LABEL[stage.status]}</span>
                      </div>

                      <StageControls
                        eventId={event.id}
                        stage={{ id: stage.id, name: stage.name, status: stage.status, resultsOpen: stage.resultsOpen }}
                        checkedInCount={stage._count.checkIns}
                        votesCount={stage._count.votes}
                      />

                      <div className="flex gap-2 flex-wrap mt-3">
                        {stage.candidates.map((c) => (
                          <span
                            key={c.id}
                            className={`flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1.5 border ${
                              stage.status === "NOT_STARTED"
                                ? "text-ink-soft bg-border-5 border-border-3"
                                : "text-ink bg-brand-soft border-brand-soft-border"
                            }`}
                          >
                            {c.name}
                            {c.selectionSource === "PROMOTED" && (
                              <span className="font-mono text-[9px] tracking-[.06em] uppercase text-brand bg-brand-soft rounded px-1 py-0.5">
                                Promoted
                              </span>
                            )}
                            {multiStage && nextStage && (
                              <PromoteCandidateButton
                                eventId={event.id}
                                candidateId={c.id}
                                nextStageName={nextStage.name}
                              />
                            )}
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
                <div className="text-[13px] font-semibold text-ink mb-1">No stages yet</div>
                <div className="text-[11.5px] text-faint">Add a stage to start building the flow.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
