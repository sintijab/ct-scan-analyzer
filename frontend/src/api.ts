export const API_ROOT = "http://localhost:8000";

export interface ApiEntityLink {
  rel: string,
  href: string,
  method: string
}

export interface ApiEntity {
  id: string,
  links: ApiEntityLink[]
}

export interface Attachment extends ApiEntity {
  name: string,
  media_type: string
}

export interface PatientSummary extends ApiEntity {
  name: string,
  date_of_birth: string
}

export interface Patient extends PatientSummary {
  sex: string,
  assigned_physician: string,
  clinical_notes: string,
  attachments?: Attachment[]
}

export async function fetchPatients(): Promise<PatientSummary[]> {
  let response = await fetch(`${API_ROOT}/patients`);
  let patients: PatientSummary[] = await response.json();
  return patients;
}

export async function fetchPatient(id: string): Promise<Patient> {
  let response = await fetch(`${API_ROOT}/patients/${id}`);
  let patient: Patient = await response.json();
  let attachments_link = patient.links.filter(link => link.rel == "attachments")[0];
  let attachmentsResponse = await fetch(`${API_ROOT}${attachments_link.href}`);
  let attachments: Attachment[] = await attachmentsResponse.json();
  patient.attachments = attachments;
  return patient;
}

export async function fetchRelativeUrl(path: string): Promise<Object> {
  let response = await fetch(`${API_ROOT}${path}`);
  let data: Object = await response.json();
  return data;
}

export function getAttachmentDataUrl(attachment: Attachment): string {
  return attachment.links.filter(l => l.rel == "data")[0].href;
}
