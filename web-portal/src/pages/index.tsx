import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Lotus Recruitment Portal</h1>
      <p>AI-powered CV-JD Matching & Question Generation</p>

      <div style={{ marginTop: '30px' }}>
        <h2>Features</h2>
        <ul>
          <li><Link href="/matching">CV-JD Matching</Link> - Match candidate CV with job descriptions</li>
          <li><Link href="/questions">Question Generation</Link> - Generate interview questions from CV</li>
        </ul>
      </div>

      <div style={{ marginTop: '30px', padding: '20px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
        <h3>Test Mode - PDF Upload</h3>
        <p>You can now test the system without database by uploading PDF files directly:</p>
        <ul>
          <li><strong>/matching</strong> - Upload CV PDF and Job Description PDF to test matching</li>
          <li><strong>/questions</strong> - Upload CV PDF to generate personalized questions</li>
        </ul>
      </div>

      <div style={{ marginTop: '30px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h3>API Status</h3>
        <p><strong>FastAPI:</strong> <span style={{ color: 'green' }}>Running on port 8000</span></p>
        <p><strong>Next.js:</strong> <span style={{ color: 'green' }}>Running on port 3000</span></p>
        <p><strong>LLM Provider:</strong> <span style={{ color: '#0070f3' }}>OpenAI (gpt-4o-mini)</span></p>
      </div>
    </div>
  );
}