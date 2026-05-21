export interface CaseFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  metadata?: {
    description?: string;
    tags?: string[];
  };
}

export interface CourtCase {
  id: string;
  title: string;
  type: 'criminal' | 'civil' | 'family' | 'corporate';
  status: 'active' | 'pending' | 'closed' | 'archived';
  filingDate: string;
  nextHearing?: string;
  hearingLocation?: string;
  assignedJudge?: string;
  assignedLawyer?: string;
  assignedProsecutor?: string;
  plaintiff: string;
  plaintiffAge?: number;
  plaintiffAddress?: string;
  defendant: string;
  description: string;
  files: CaseFile[];
  priority: 'high' | 'medium' | 'low';
}

export interface TimelineEvent {
  id: string;
  caseId: string;
  type: 'filing' | 'hearing' | 'document' | 'ruling' | 'assignment';
  title: string;
  description: string;
  timestamp: string;
  actor: string;
  metadata?: Record<string, any>;
}