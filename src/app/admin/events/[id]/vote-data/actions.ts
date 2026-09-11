"use server";

import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { publish } from "@/lib/realtime";
import { namaJemaatKey, normKey } from "@/lib/normalize";
import { uploadImage } from "@/lib/storage";
import { revalidatePath } from "next/cache";

async function requireSession() {
  const session = await getAdminSession();
  if (!session) return null;
  return session;
}

function revalidate(eventId: string) {
  revalidatePath(`/admin/events/${eventId}/vote-data`);
  revalidatePath(`/admin/events/${eventId}/flow`);
  publish(eventId);
}

/** Stages that can still receive candidates (candidates lock once a stage starts). */
async function editableStages(eventId: string) {
  return prisma.stage.findMany({
    where: { eventId, status: "NOT_STARTED" },
    orderBy: { order: "asc" },
    select: { id: true, name: true, order: true },
  });
}

/* -------------------------------------------------------------------------- */
/* Validation / "Status Check"                                               */
/* -------------------------------------------------------------------------- */

export async function setParticipantsValidatedAction(
  eventId: string,
  participantIds: string[],
  validated: boolean
) {
  const session = await requireSession();
  if (!session) return { ok: false as const, error: "Not authenticated" };
  const ids = [...new Set(participantIds)].filter(Boolean);
  if (!ids.length) return { ok: false as const, error: "Tidak ada data yang dipilih." };

  const { count } = await prisma.participant.updateMany({
    where: { id: { in: ids }, eventId },
    data: { validatedAt: validated ? new Date() : null },
  });
  await logAudit(
    eventId,
    validated ? `${count} peserta ditandai valid` : `${count} peserta batal divalidasi`,
    session.name
  );
  revalidate(eventId);
  return { ok: true as const, count };
}

/* -------------------------------------------------------------------------- */
/* Delete                                                                    */
/* -------------------------------------------------------------------------- */

export async function deleteVoteDataParticipantsAction(eventId: string, participantIds: string[]) {
  const session = await requireSession();
  if (!session) return { ok: false as const, error: "Not authenticated" };
  const ids = [...new Set(participantIds)].filter(Boolean);
  if (!ids.length) return { ok: false as const, error: "Tidak ada data yang dipilih." };

  const { count } = await prisma.participant.deleteMany({
    where: { id: { in: ids }, eventId },
  });
  await logAudit(eventId, `${count} data peserta dihapus dari Management Data Vote`, session.name);
  revalidate(eventId);
  return { ok: true as const, count };
}

/* -------------------------------------------------------------------------- */
/* Photo upload (writes the same Participant.photo the registration uses)     */
/* -------------------------------------------------------------------------- */

export async function uploadParticipantPhotoAction(
  eventId: string,
  participantId: string,
  photo: string
) {
  const session = await requireSession();
  if (!session) return { ok: false as const, error: "Not authenticated" };
  if (!photo || !photo.startsWith("data:image/")) {
    return { ok: false as const, error: "Foto tidak valid." };
  }

  const participant = await prisma.participant.findUnique({ where: { id: participantId } });
  if (!participant || participant.eventId !== eventId) {
    return { ok: false as const, error: "Peserta tidak ditemukan." };
  }

  const storedPhoto = await uploadImage(photo, `participants/${eventId}/${participantId}.jpg`);
  await prisma.participant.update({ where: { id: participantId }, data: { photo: storedPhoto } });
  await logAudit(eventId, `Foto ${participant.name ?? participant.token} diunggah oleh admin`, session.name);
  revalidate(eventId);
  return { ok: true as const };
}

/* -------------------------------------------------------------------------- */
/* Send checked participants as candidates                                   */
/* -------------------------------------------------------------------------- */

export async function sendParticipantsAsCandidatesAction(
  eventId: string,
  participantIds: string[],
  stageId: string
) {
  const session = await requireSession();
  if (!session) return { ok: false as const, error: "Not authenticated" };

  const stage = await prisma.stage.findUnique({
    where: { id: stageId },
    include: { candidates: true },
  });
  if (!stage || stage.eventId !== eventId) return { ok: false as const, error: "Stage tidak ditemukan." };
  if (stage.status !== "NOT_STARTED") {
    return { ok: false as const, error: "Kandidat terkunci setelah stage dimulai." };
  }

  const ids = [...new Set(participantIds)].filter(Boolean);
  // Only checked/valid participants may become candidates (enforced server-side).
  const participants = await prisma.participant.findMany({
    where: { id: { in: ids }, eventId, validatedAt: { not: null }, name: { not: null } },
  });
  if (!participants.length) {
    return { ok: false as const, error: "Tidak ada data valid yang dipilih." };
  }

  // Dedup against candidates already on this stage — never submit the same person twice.
  const existingPids = new Set(stage.candidates.map((c) => c.participantId).filter(Boolean) as string[]);
  const existingNames = new Set(stage.candidates.map((c) => normKey(c.name)));
  const fresh = participants.filter(
    (p) => !existingPids.has(p.id) && !existingNames.has(normKey(p.name))
  );
  if (!fresh.length) {
    return { ok: false as const, error: "Semua peserta terpilih sudah menjadi kandidat." };
  }

  const base = stage.candidates.length;
  await prisma.candidate.createMany({
    data: fresh.map((p, i) => ({
      stageId,
      name: p.name!,
      note: p.jemaat ? `Jemaat ${p.jemaat}` : "",
      photo: p.photo,
      participantId: p.id,
      order: base + i + 1,
      selectionSource: "MANUAL" as const,
    })),
  });
  await logAudit(
    eventId,
    `${fresh.length} peserta dikirim sebagai kandidat ke "${stage.name}"`,
    session.name
  );
  revalidate(eventId);
  return { ok: true as const, added: fresh.length, skipped: participants.length - fresh.length };
}

/* -------------------------------------------------------------------------- */
/* Upload candidate file → compare against credential / participant data      */
/* -------------------------------------------------------------------------- */

export type CompareRowInput = { name: string; jemaat: string };

export type CompareRow = {
  name: string;
  jemaat: string;
  key: string;
  status: "cocok" | "tidak-cocok" | "duplicate";
  match: {
    source: "credential" | "participant";
    name: string;
    jemaat: string;
    token: string | null;
    hasPhoto: boolean;
  } | null;
};

export type CompareResult = {
  ok: true;
  usesCredentials: boolean;
  stages: { id: string; name: string; order: number }[];
  total: number;
  matched: number;
  unmatched: number;
  duplicates: number;
  rows: CompareRow[];
};

export async function compareCandidateUploadAction(
  eventId: string,
  rows: CompareRowInput[]
): Promise<CompareResult | { ok: false; error: string }> {
  const session = await requireSession();
  if (!session) return { ok: false, error: "Not authenticated" };

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { ok: false, error: "Acara tidak ditemukan." };

  const clean = rows
    .map((r) => ({ name: (r.name ?? "").replace(/\s+/g, " ").trim(), jemaat: (r.jemaat ?? "").replace(/\s+/g, " ").trim() }))
    .filter((r) => r.name.length > 0);
  if (!clean.length) return { ok: false, error: "File tidak berisi baris yang valid." };

  // Build the credential/participant lookup: `Nama + Jemaat` is the primary key.
  const lookup = new Map<
    string,
    { source: "credential" | "participant"; name: string; jemaat: string; token: string | null; hasPhoto: boolean }
  >();

  if (event.useCredentials) {
    const credentials = await prisma.credential.findMany({
      where: { eventId },
      include: { participant: { select: { token: true, photo: true } } },
    });
    for (const c of credentials) {
      lookup.set(namaJemaatKey(c.name, c.jemaat), {
        source: "credential",
        name: c.name,
        jemaat: c.jemaat,
        token: c.participant?.token ?? null,
        hasPhoto: Boolean(c.participant?.photo),
      });
    }
  } else {
    const participants = await prisma.participant.findMany({
      where: { eventId, name: { not: null } },
      select: { name: true, jemaat: true, token: true, photo: true },
    });
    for (const p of participants) {
      lookup.set(namaJemaatKey(p.name, p.jemaat), {
        source: "participant",
        name: p.name!,
        jemaat: p.jemaat ?? "",
        token: p.token,
        hasPhoto: Boolean(p.photo),
      });
    }
  }

  const seen = new Set<string>();
  const out: CompareRow[] = clean.map((r) => {
    const key = namaJemaatKey(r.name, r.jemaat);
    if (seen.has(key)) {
      return { name: r.name, jemaat: r.jemaat, key, status: "duplicate", match: null };
    }
    seen.add(key);
    const match = lookup.get(key) ?? null;
    return {
      name: r.name,
      jemaat: r.jemaat,
      key,
      status: match ? "cocok" : "tidak-cocok",
      match,
    };
  });

  const stages = await editableStages(eventId);
  return {
    ok: true,
    usesCredentials: event.useCredentials,
    stages,
    total: out.length,
    matched: out.filter((r) => r.status === "cocok").length,
    unmatched: out.filter((r) => r.status === "tidak-cocok").length,
    duplicates: out.filter((r) => r.status === "duplicate").length,
    rows: out,
  };
}

/**
 * Turn the matched rows of an upload comparison into candidates. Re-resolves
 * every key against the live credential/participant data — the uploaded file is
 * never the source of truth and never creates a credential.
 */
export async function sendComparedAsCandidatesAction(
  eventId: string,
  matchedKeys: string[],
  stageId: string
) {
  const session = await requireSession();
  if (!session) return { ok: false as const, error: "Not authenticated" };

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { ok: false as const, error: "Acara tidak ditemukan." };

  const stage = await prisma.stage.findUnique({
    where: { id: stageId },
    include: { candidates: true },
  });
  if (!stage || stage.eventId !== eventId) return { ok: false as const, error: "Stage tidak ditemukan." };
  if (stage.status !== "NOT_STARTED") {
    return { ok: false as const, error: "Kandidat terkunci setelah stage dimulai." };
  }

  const wanted = new Set(matchedKeys);
  if (!wanted.size) return { ok: false as const, error: "Tidak ada data cocok yang dipilih." };

  type Source = { name: string; jemaat: string; participantId: string | null; photo: string | null };
  const sources: Source[] = [];

  if (event.useCredentials) {
    const credentials = await prisma.credential.findMany({
      where: { eventId },
      include: { participant: { select: { id: true, photo: true } } },
    });
    for (const c of credentials) {
      if (!wanted.has(namaJemaatKey(c.name, c.jemaat))) continue;
      sources.push({
        name: c.name,
        jemaat: c.jemaat,
        participantId: c.participant?.id ?? null,
        photo: c.participant?.photo ?? null,
      });
    }
  } else {
    const participants = await prisma.participant.findMany({
      where: { eventId, name: { not: null } },
      select: { id: true, name: true, jemaat: true, photo: true },
    });
    for (const p of participants) {
      if (!wanted.has(namaJemaatKey(p.name, p.jemaat))) continue;
      sources.push({ name: p.name!, jemaat: p.jemaat ?? "", participantId: p.id, photo: p.photo });
    }
  }

  if (!sources.length) return { ok: false as const, error: "Data cocok tidak ditemukan lagi di kredensial." };

  const existingPids = new Set(stage.candidates.map((c) => c.participantId).filter(Boolean) as string[]);
  const existingNames = new Set(stage.candidates.map((c) => `${normKey(c.name)}||${normKey(c.note)}`));
  const fresh = sources.filter((s) => {
    if (s.participantId && existingPids.has(s.participantId)) return false;
    const noteKey = s.jemaat ? `jemaat ${normKey(s.jemaat)}` : "";
    return !existingNames.has(`${normKey(s.name)}||${noteKey}`);
  });
  if (!fresh.length) return { ok: false as const, error: "Semua data cocok sudah menjadi kandidat." };

  const base = stage.candidates.length;
  await prisma.candidate.createMany({
    data: fresh.map((s, i) => ({
      stageId,
      name: s.name,
      note: s.jemaat ? `Jemaat ${s.jemaat}` : "",
      photo: s.photo,
      participantId: s.participantId,
      order: base + i + 1,
      selectionSource: "MANUAL" as const,
    })),
  });
  await logAudit(
    eventId,
    `${fresh.length} data kredensial cocok dikirim sebagai kandidat ke "${stage.name}"`,
    session.name
  );
  revalidate(eventId);
  return { ok: true as const, added: fresh.length, skipped: sources.length - fresh.length };
}
