import { useState, useRef } from 'react';

interface MatchingResult {
  candidateName?: string;
  jobTitle?: string;
  overallScore: number;
  skillMatchScore: number;
  experienceMatchScore: number;
  educationMatchScore: number;
  skillGaps: string[];
  strengths: string[];
  matchedPreferredSkills: string[];
  llmFeedback: string;
  parsedCV?: {
    name: string;
    skills: string[];
    experience_years: number;
    education: any[];
    projects: any[];
  };
  parsedJob?: {
    title: string;
    required_skills: string[];
    preferred_skills: string[];
    responsibilities: string[];
    experience_level: string;
  };
}

export default function Matching() {
  const [mode, setMode] = useState<'pdf' | 'ids'>('pdf');
  const [candidateId, setCandidateId] = useState('test-candidate-1');
  const [jobId, setJobId] = useState('test-job-1');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [jobFile, setJobFile] = useState<File | null>(null);
  const [result, setResult] = useState<MatchingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showParsed, setShowParsed] = useState(false);

  const handleMatch = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      let res: Response;

      if (mode === 'pdf') {
        if (!cvFile || !jobFile) {
          throw new Error('Please upload both CV and Job Description PDFs');
        }

        const formData = new FormData();
        formData.append('cvFile', cvFile);
        formData.append('jobFile', jobFile);

        res = await fetch('http://localhost:8000/api/matching/cv-jd/pdf', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch('http://localhost:8000/api/matching/cv-jd', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidateId, jobId }),
        });
      }

      if (!res.ok) throw new Error('Failed to get matching result');

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#eab308';
    return '#ef4444';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui, sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>CV-JD Matching</h1>
      <p>Compare candidate CV with job description to compute match scores.</p>

      {/* Mode Selection */}
      <div style={{ marginTop: '20px', display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setMode('pdf')}
          style={{
            padding: '10px 20px',
            background: mode === 'pdf' ? '#0070f3' : '#e5e5e5',
            color: mode === 'pdf' ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Upload PDFs (Test Mode)
        </button>
        <button
          onClick={() => setMode('ids')}
          style={{
            padding: '10px 20px',
            background: mode === 'ids' ? '#0070f3' : '#e5e5e5',
            color: mode === 'ids' ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Use Database IDs
        </button>
      </div>

      {/* PDF Upload Mode */}
      {mode === 'pdf' && (
        <div style={{ padding: '20px', background: '#f9f9f9', borderRadius: '8px', marginTop: '20px' }}>
          <h3 style={{ marginTop: 0 }}>Upload Documents</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Upload CV and Job Description PDFs to test matching without database.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Candidate CV (PDF)
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                style={{ padding: '10px', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }}
              />
              {cvFile && (
                <p style={{ margin: '8px 0 0', color: '#22c55e', fontSize: '14px' }}>
                  Selected: {cvFile.name}
                </p>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Job Description (PDF)
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setJobFile(e.target.files?.[0] || null)}
                style={{ padding: '10px', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }}
              />
              {jobFile && (
                <p style={{ margin: '8px 0 0', color: '#22c55e', fontSize: '14px' }}>
                  Selected: {jobFile.name}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Database ID Mode */}
      {mode === 'ids' && (
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Candidate ID"
            value={candidateId}
            onChange={(e) => setCandidateId(e.target.value)}
            style={{ padding: '10px', width: '200px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="Job ID"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            style={{ padding: '10px', width: '200px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>
      )}

      {/* Match Button */}
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={handleMatch}
          disabled={loading}
          style={{
            padding: '12px 30px',
            background: loading ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
          }}
        >
          {loading ? 'Analyzing...' : 'Match CV with Job'}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: '20px', padding: '10px', background: '#fee', color: '#c00', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '30px' }}>
          <h2>Matching Results</h2>

          {/* Overall Score */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            <div style={{ padding: '20px', background: '#f9f9f9', borderRadius: '8px' }}>
              <h3>{result.candidateName || 'Candidate'}</h3>
              <p style={{ color: '#666' }}>for {result.jobTitle || 'Position'}</p>
            </div>

            <div style={{
              padding: '20px',
              background: `linear-gradient(135deg, ${getScoreColor(result.overallScore)}22, ${getScoreColor(result.overallScore)}44)`,
              borderRadius: '8px',
              textAlign: 'center',
              border: `2px solid ${getScoreColor(result.overallScore)}`
            }}>
              <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Overall Match</p>
              <p style={{ fontSize: '48px', margin: 0, fontWeight: 'bold', color: getScoreColor(result.overallScore) }}>
                {result.overallScore}
              </p>
              <p style={{ margin: 0, color: getScoreColor(result.overallScore), fontWeight: 'bold' }}>
                {getScoreLabel(result.overallScore)}
              </p>
            </div>
          </div>

          {/* Score Breakdown */}
          <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
            <div style={{ padding: '15px', background: '#f0f9ff', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 5px', color: '#666', fontSize: '14px' }}>Skills Match</p>
              <p style={{ fontSize: '28px', margin: 0, fontWeight: 'bold', color: getScoreColor(result.skillMatchScore) }}>
                {result.skillMatchScore}%
              </p>
            </div>
            <div style={{ padding: '15px', background: '#f0fdf4', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 5px', color: '#666', fontSize: '14px' }}>Experience</p>
              <p style={{ fontSize: '28px', margin: 0, fontWeight: 'bold', color: getScoreColor(result.experienceMatchScore) }}>
                {result.experienceMatchScore}%
              </p>
            </div>
            <div style={{ padding: '15px', background: '#fefce8', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 5px', color: '#666', fontSize: '14px' }}>Education</p>
              <p style={{ fontSize: '28px', margin: 0, fontWeight: 'bold', color: getScoreColor(result.educationMatchScore) }}>
                {result.educationMatchScore}%
              </p>
            </div>
          </div>

          {/* Skill Gaps & Strengths */}
          <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ padding: '20px', background: '#fef2f2', borderRadius: '8px' }}>
              <h3 style={{ marginTop: 0, color: '#991b1b' }}>Skill Gaps</h3>
              {result.skillGaps?.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {result.skillGaps.map((skill, i) => (
                    <span key={i} style={{ padding: '4px 12px', background: '#fee2e2', borderRadius: '20px', fontSize: '14px' }}>
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#22c55e' }}>No skill gaps - perfect match!</p>
              )}
            </div>

            <div style={{ padding: '20px', background: '#f0fdf4', borderRadius: '8px' }}>
              <h3 style={{ marginTop: 0, color: '#166534' }}>Strengths</h3>
              {result.strengths?.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {result.strengths.map((skill, i) => (
                    <span key={i} style={{ padding: '4px 12px', background: '#bbf7d0', borderRadius: '20px', fontSize: '14px' }}>
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#666' }}>No matching skills found</p>
              )}
            </div>
          </div>

          {/* AI Feedback */}
          <div style={{ marginTop: '20px', padding: '20px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ marginTop: 0 }}>AI Feedback</h3>
            <p style={{ lineHeight: '1.6' }}>{result.llmFeedback}</p>
          </div>

          {/* Parsed Data (only for PDF mode) */}
          {result.parsedCV && mode === 'pdf' && (
            <div style={{ marginTop: '20px' }}>
              <button
                onClick={() => setShowParsed(!showParsed)}
                style={{
                  padding: '8px 16px',
                  background: '#f0f0f0',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                {showParsed ? 'Hide' : 'Show'} Parsed Data
              </button>

              {showParsed && (
                <div style={{ marginTop: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  {/* Parsed CV */}
                  <div style={{ padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
                    <h4 style={{ marginTop: 0, color: '#0070f3' }}>Parsed CV</h4>
                    <p><strong>Name:</strong> {result.parsedCV.name}</p>
                    <p><strong>Experience:</strong> {result.parsedCV.experience_years} years</p>
                    <p><strong>Skills:</strong></p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {result.parsedCV.skills?.map((s: string, i: number) => (
                        <span key={i} style={{ padding: '2px 8px', background: '#e0e0e0', borderRadius: '12px', fontSize: '12px' }}>
                          {s}
                        </span>
                      ))}
                    </div>
                    {result.parsedCV.education?.length > 0 && (
                      <>
                        <p><strong>Education:</strong></p>
                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
                          {result.parsedCV.education.map((e: any, i: number) => (
                            <li key={i}>{e.degree} - {e.institution}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>

                  {/* Parsed Job */}
                  {result.parsedJob && (
                    <div style={{ padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
                      <h4 style={{ marginTop: 0, color: '#0070f3' }}>Parsed Job</h4>
                      <p><strong>Title:</strong> {result.parsedJob.title}</p>
                      <p><strong>Level:</strong> {result.parsedJob.experience_level}</p>
                      <p><strong>Required Skills:</strong></p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {result.parsedJob.required_skills?.map((s: string, i: number) => (
                          <span key={i} style={{ padding: '2px 8px', background: '#fee2e2', borderRadius: '12px', fontSize: '12px' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                      {result.parsedJob.preferred_skills?.length > 0 && (
                        <>
                          <p style={{ marginTop: '10px' }}><strong>Preferred Skills:</strong></p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {result.parsedJob.preferred_skills?.map((s: string, i: number) => (
                              <span key={i} style={{ padding: '2px 8px', background: '#fef3c7', borderRadius: '12px', fontSize: '12px' }}>
                                {s}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}