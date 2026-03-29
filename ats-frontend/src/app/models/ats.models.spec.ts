import { PIPELINE_STAGES, STAGE_LABELS, STAGE_COLORS } from './ats.models';

describe('ATS Models', () => {
  it('should define all 7 pipeline stages', () => {
    expect(PIPELINE_STAGES.length).toBe(7);
    expect(PIPELINE_STAGES).toContain('APPLIED');
    expect(PIPELINE_STAGES).toContain('SCREENING');
    expect(PIPELINE_STAGES).toContain('INTERVIEW');
    expect(PIPELINE_STAGES).toContain('ASSESSMENT');
    expect(PIPELINE_STAGES).toContain('OFFER');
    expect(PIPELINE_STAGES).toContain('HIRED');
    expect(PIPELINE_STAGES).toContain('REJECTED');
  });

  it('should have labels for all stages', () => {
    for (const stage of PIPELINE_STAGES) {
      expect(STAGE_LABELS[stage]).toBeTruthy();
    }
  });

  it('should have correct label text', () => {
    expect(STAGE_LABELS['APPLIED']).toBe('Applied');
    expect(STAGE_LABELS['SCREENING']).toBe('Screening');
    expect(STAGE_LABELS['INTERVIEW']).toBe('Interview');
    expect(STAGE_LABELS['ASSESSMENT']).toBe('Assessment');
    expect(STAGE_LABELS['OFFER']).toBe('Offer');
    expect(STAGE_LABELS['HIRED']).toBe('Hired');
    expect(STAGE_LABELS['REJECTED']).toBe('Rejected');
  });

  it('should have colors for all stages', () => {
    for (const stage of PIPELINE_STAGES) {
      expect(STAGE_COLORS[stage]).toBeTruthy();
      expect(STAGE_COLORS[stage]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
