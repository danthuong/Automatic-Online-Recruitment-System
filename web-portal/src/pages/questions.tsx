import { useState } from 'react';

interface Question {
  type: string;
  difficulty: string;
  title: string;
  content: string;
  constraints?: string[];
  examples?: { input: string; output: string }[];
  starterCode?: { python?: string; javascript?: string };
  tags?: string[];
}

interface ParsedCV {
  name: string;
  skills: string[];
  experience_years: number;
  education: any[];
  projects: any[];
}

export default function Questions() {
  const [mode, setMode] = useState<'pdf' | 'ids'>('pdf');
  const [candidateId, setCandidateId] = useState('test-candidate-1');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [parsedCV, setParsedCV] = useState<ParsedCV | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setQuestions([]);

    try {
      let res: Response;

      if (mode === 'pdf') {
        if (!cvFile) {
          throw new Error('Please upload a CV PDF');
        }

        const formData = new FormData();
        formData.append('cvFile', cvFile);

        res = await fetch('http://localhost:8000/api/questions/generate/pdf', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch('http://localhost:8000/api/questions/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidateId }),
        });
      }

      if (!res.ok) throw new Error('Failed to generate questions');

      const data = await res.json();
      setQuestions(data.questions || []);
      setParsedCV(data.parsedCV || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return '#22c55e';
      case 'medium': return '#eab308';
      case 'hard': return '#ef4444';
      default: return '#666';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'code': return '#0070f3';
      case 'essay': return '#8b5cf6';
      default: return '#666';
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui, sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>Question Generation</h1>
      <p>Generate interview questions based on candidate's CV skills.</p>

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
          Upload CV PDF (Test Mode)
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
          Use Database ID
        </button>
      </div>

      {/* PDF Upload Mode */}
      {mode === 'pdf' && (
        <div style={{ padding: '20px', background: '#f9f9f9', borderRadius: '8px', marginTop: '20px' }}>
          <h3 style={{ marginTop: 0 }}>Upload CV</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Upload a CV PDF to generate personalized interview questions.
          </p>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Candidate CV (PDF)
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setCvFile(e.target.files?.[0] || null)}
              style={{ padding: '10px', width: '100%', maxWidth: '400px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            {cvFile && (
              <p style={{ margin: '8px 0 0', color: '#22c55e', fontSize: '14px' }}>
                Selected: {cvFile.name}
              </p>
            )}
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
        </div>
      )}

      {/* Generate Button */}
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={handleGenerate}
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
          {loading ? 'Generating Questions...' : 'Generate Questions'}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: '20px', padding: '10px', background: '#fee', color: '#c00', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {/* Parsed CV Info */}
      {parsedCV && mode === 'pdf' && (
        <div style={{ marginTop: '20px', padding: '15px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
          <h4 style={{ marginTop: 0, color: '#0070f3' }}>Parsed CV Information</h4>
          <p><strong>Name:</strong> {parsedCV.name}</p>
          <p><strong>Experience:</strong> {parsedCV.experience_years} years</p>
          <p><strong>Skills detected:</strong></p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {parsedCV.skills?.map((s: string, i: number) => (
              <span key={i} style={{ padding: '4px 10px', background: '#e0f2fe', borderRadius: '12px', fontSize: '13px' }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <h2>Generated Questions ({questions.length})</h2>

        {questions.length === 0 && !loading && !error && (
          <p style={{ color: '#666' }}>Click "Generate Questions" to create interview questions.</p>
        )}

        {questions.map((q, index) => (
          <div key={index} style={{ marginTop: '20px', padding: '20px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ margin: '0 0 10px' }}>
                {index + 1}. {q.title}
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ padding: '4px 12px', background: getTypeColor(q.type), color: 'white', borderRadius: '20px', fontSize: '12px', textTransform: 'uppercase' }}>
                  {q.type}
                </span>
                <span style={{ padding: '4px 12px', background: getDifficultyColor(q.difficulty), color: 'white', borderRadius: '20px', fontSize: '12px', textTransform: 'uppercase' }}>
                  {q.difficulty}
                </span>
              </div>
            </div>

            <p style={{ color: '#374151', lineHeight: '1.6' }}>{q.content}</p>

            {q.constraints && q.constraints.length > 0 && (
              <div style={{ marginTop: '15px' }}>
                <strong style={{ fontSize: '14px' }}>Constraints:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px', fontSize: '14px', color: '#666' }}>
                  {q.constraints.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}

            {q.examples && q.examples.length > 0 && (
              <div style={{ marginTop: '15px', padding: '12px', background: '#f8fafc', borderRadius: '6px' }}>
                <strong style={{ fontSize: '14px' }}>Examples:</strong>
                {q.examples.map((ex, i) => (
                  <div key={i} style={{ marginTop: '8px', fontSize: '14px' }}>
                    <div><strong>Input:</strong> <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{ex.input}</code></div>
                    <div><strong>Output:</strong> <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{ex.output}</code></div>
                  </div>
                ))}
              </div>
            )}

            {q.starterCode && (
              <div style={{ marginTop: '15px' }}>
                <strong style={{ fontSize: '14px' }}>Starter Code:</strong>
                <div style={{ marginTop: '8px' }}>
                  {q.starterCode.python && (
                    <div>
                      <span style={{ fontSize: '12px', color: '#666' }}>Python:</span>
                      <pre style={{ margin: '5px 0', padding: '10px', background: '#1e293b', color: '#e2e8f0', borderRadius: '4px', overflow: 'auto', fontSize: '13px' }}>
                        {q.starterCode.python}
                      </pre>
                    </div>
                  )}
                  {q.starterCode.javascript && (
                    <div>
                      <span style={{ fontSize: '12px', color: '#666' }}>JavaScript:</span>
                      <pre style={{ margin: '5px 0', padding: '10px', background: '#1e293b', color: '#e2e8f0', borderRadius: '4px', overflow: 'auto', fontSize: '13px' }}>
                        {q.starterCode.javascript}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {q.tags && q.tags.length > 0 && (
              <div style={{ marginTop: '15px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {q.tags.map((tag, i) => (
                  <span key={i} style={{ padding: '2px 10px', background: '#f3f4f6', borderRadius: '12px', fontSize: '12px', color: '#666' }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}