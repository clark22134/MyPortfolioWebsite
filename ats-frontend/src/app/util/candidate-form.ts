import { Candidate, CandidateRequest } from '../models/ats.models';

/**
 * Seed a `Partial<CandidateRequest>` form model from an existing candidate.
 * Used by the pipeline and talent pages to populate the edit modal.
 */
export function seedCandidateEditForm(c: Candidate): Partial<CandidateRequest> {
  return {
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    phone: c.phone,
    resumeUrl: c.resumeUrl,
    notes: c.notes,
    skills: c.skills,
    address: c.address ?? '',
    latitude: c.latitude ?? null,
    longitude: c.longitude ?? null,
    lastAssignmentDays: c.lastAssignmentDays ?? 0,
    stage: c.stage,
    jobId: c.jobId
  };
}

/**
 * Coerce a `Partial<CandidateRequest>` into the full request payload, defaulting
 * blank fields and falling back to {@code fallbackJobId} when the form doesn't
 * carry a jobId of its own (e.g. the pipeline page never lets the user move a
 * candidate to a different job).
 */
export function toCandidateRequest(form: Partial<CandidateRequest>, fallbackJobId: number): CandidateRequest {
  return {
    firstName: form.firstName ?? '',
    lastName: form.lastName ?? '',
    email: form.email ?? '',
    phone: form.phone ?? '',
    resumeUrl: form.resumeUrl ?? '',
    notes: form.notes ?? '',
    skills: form.skills ?? '',
    address: form.address ?? '',
    latitude: form.latitude ?? null,
    longitude: form.longitude ?? null,
    lastAssignmentDays: form.lastAssignmentDays ?? 0,
    stage: form.stage ?? 'APPLIED',
    jobId: form.jobId ?? fallbackJobId
  };
}
