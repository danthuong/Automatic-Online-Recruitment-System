"""
GitHub Repository Evaluation Service.

Evaluates GitHub repositories for job-seeker assessment by analyzing:
- Code quality
- Documentation
- Best practices
- Tech stack
- Testing
- Security
- Architecture
"""
import json
import logging
import os
import re
import shutil
import subprocess
import tempfile
from datetime import datetime
from typing import Dict, List, Optional, Any
from urllib.parse import urlparse

import httpx

from ..models.evaluations import RepoEvaluation, EvaluationStatus
from ..core.config import settings
from .llm_service import get_llm_service

logger = logging.getLogger(__name__)

# Language extensions for detection
LANGUAGE_EXTENSIONS = {
    '.py': 'Python',
    '.js': 'JavaScript',
    '.ts': 'TypeScript',
    '.jsx': 'JavaScript',
    '.tsx': 'TypeScript',
    '.java': 'Java',
    '.cpp': 'C++',
    '.c': 'C',
    '.go': 'Go',
    '.rs': 'Rust',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.scala': 'Scala',
    '.cs': 'C#',
    '.vue': 'Vue',
    '.svelte': 'Svelte',
}

# Config files to check
CONFIG_FILES = {
    'package.json': 'npm/Node.js',
    'requirements.txt': 'Python',
    'Pipfile': 'Python',
    'pyproject.toml': 'Python',
    'setup.py': 'Python',
    'Cargo.toml': 'Rust',
    'go.mod': 'Go',
    'Gemfile': 'Ruby',
    'pom.xml': 'Java',
    'build.gradle': 'Java',
    'composer.json': 'PHP',
    'Podfile': 'iOS',
    'Cartfile': 'iOS',
    '.eslintrc': 'ESLint',
    'tsconfig.json': 'TypeScript',
    'next.config.js': 'Next.js',
    'astro.config.mjs': 'Astro',
    'vite.config.js': 'Vite',
    'webpack.config.js': 'Webpack',
    'Dockerfile': 'Docker',
    'docker-compose.yml': 'Docker',
    '.github/workflows': 'GitHub Actions',
    '.gitlab-ci.yml': 'GitLab CI',
}

# Evaluation rubric weights
RUBRIC_WEIGHTS = {
    'code_quality': 0.20,
    'documentation': 0.15,
    'best_practices': 0.15,
    'tech_stack': 0.10,
    'testing': 0.15,
    'security': 0.10,
    'architecture': 0.15,
}

# Max file size for analysis (100KB)
MAX_FILE_SIZE = 100 * 1024

# Files to skip
SKIP_PATTERNS = {
    'node_modules', '__pycache__', '.git', 'dist', 'build', 'target',
    '.next', '.nuxt', 'coverage', '.cache', 'venv', 'env', '.venv',
    'vendor', 'bin', 'obj', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    '.idea', '.vscode', '*.log', '*.min.js', '*.min.css',
}


class RepoEvaluationService:
    """Service for evaluating GitHub repositories."""

    def __init__(self):
        self._llm = None

    @property
    def llm(self):
        """Lazy load LLM service."""
        if self._llm is None:
            self._llm = get_llm_service()
        return self._llm

    def parse_github_url(self, repo_url: str) -> Dict[str, str]:
        """Parse GitHub URL to extract owner and repo name."""
        parsed = urlparse(repo_url)
        path_parts = parsed.path.strip('/').split('/')

        if len(path_parts) < 2:
            raise ValueError(f"Invalid GitHub URL: {repo_url}")

        owner = path_parts[0]
        repo = path_parts[1].replace('.git', '')

        return {'owner': owner, 'repo': repo}

    def clone_repo(self, repo_url: str, temp_dir: str) -> bool:
        """Clone a GitHub repository to a temporary directory."""
        try:
            # Use git CLI to clone (shallow clone for efficiency)
            result = subprocess.run(
                ['git', 'clone', '--depth', '1', repo_url, temp_dir],
                capture_output=True,
                text=True,
                timeout=120  # 2 minute timeout
            )
            if result.returncode != 0:
                logger.error(f"Git clone failed: {result.stderr}")
                return False
            return True
        except subprocess.TimeoutExpired:
            logger.error("Git clone timed out")
            return False
        except Exception as e:
            logger.error(f"Git clone error: {e}")
            return False

    def fetch_repo_contents_api(self, owner: str, repo: str) -> Optional[Dict]:
        """Fetch repository contents using GitHub API (fallback if git not available)."""
        try:
            # Use synchronous httpx client
            with httpx.Client(timeout=30.0) as client:
                # Get repo info
                repo_response = client.get(
                    f"https://api.github.com/repos/{owner}/{repo}"
                )
                if repo_response.status_code != 200:
                    logger.error(f"GitHub API error: {repo_response.status_code}")
                    return None

                repo_info = repo_response.json()
                default_branch = repo_info.get('default_branch', 'main')

                # Get README
                readme_content = self._fetch_readme(owner, repo)

                # Get file tree
                tree_response = client.get(
                    f"https://api.github.com/repos/{owner}/{repo}/git/trees/{default_branch}?recursive=1"
                )

                if tree_response.status_code != 200:
                    logger.error(f"GitHub tree API error: {tree_response.status_code}")
                    return None

                tree = tree_response.json()
                files = [item for item in tree.get('tree', []) if item.get('type') == 'blob']

                return {
                    'repo_info': repo_info,
                    'files': files,
                    'readme': readme_content,
                    'default_branch': default_branch
                }
        except Exception as e:
            logger.error(f"GitHub API fetch error: {e}")
            return None

    def _fetch_readme(self, owner: str, repo: str) -> Optional[str]:
        """Fetch README content from repository."""
        try:
            import asyncio
            return asyncio.run(self._fetch_readme_async(owner, repo))
        except Exception as e:
            logger.error(f"README fetch error: {e}")
            return None

    async def _fetch_readme_async(self, owner: str, repo: str) -> Optional[str]:
        """Fetch README content from repository (async)."""
        async with httpx.AsyncClient() as client:
            # Try common README filenames
            readme_names = ['README.md', 'README.rst', 'README.txt', 'README']
            for name in readme_names:
                response = await client.get(
                    f"https://api.github.com/repos/{owner}/{repo}/contents/{name}"
                )
                if response.status_code == 200:
                    content = response.json()
                    if 'content' in content:
                        import base64
                        return base64.b64decode(content['content']).decode('utf-8')
            return None

    def analyze_file_structure(self, directory: str) -> Dict[str, Any]:
        """Analyze the file structure of a repository."""
        file_count = 0
        total_lines = 0
        languages: Dict[str, int] = {}
        config_files_found: Dict[str, bool] = {}
        has_tests = False
        has_docs = False
        max_depth = 0
        directory_structure = []

        for root, dirs, files in os.walk(directory):
            # Skip unwanted directories
            dirs[:] = [d for d in dirs if not any(
                pattern in d for pattern in SKIP_PATTERNS
            )]

            # Track depth
            depth = root.replace(directory, '').count(os.sep)
            max_depth = max(max_depth, depth)

            # Check for docs directory
            if 'docs' in root.lower() or 'documentation' in root.lower():
                has_docs = True

            # Check for test directories
            test_patterns = ['test', 'tests', '__tests__', 'spec', 'specs']
            if any(pattern in root for pattern in test_patterns):
                has_tests = True

            for file in files:
                # Skip files matching patterns
                if any(pattern in file for pattern in SKIP_PATTERNS):
                    continue

                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, directory)

                # Track directory structure (limited depth)
                if depth <= 2:
                    directory_structure.append(rel_path)

                # Get file extension
                _, ext = os.path.splitext(file)

                # Count files and lines
                file_count += 1

                # Get file size
                try:
                    file_size = os.path.getsize(file_path)
                    if file_size <= MAX_FILE_SIZE:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            lines = len(f.readlines())
                            total_lines += lines

                        # Track language
                        if ext in LANGUAGE_EXTENSIONS:
                            lang = LANGUAGE_EXTENSIONS[ext]
                            languages[lang] = languages.get(lang, 0) + 1
                except Exception:
                    pass

                # Check for config files
                if file in CONFIG_FILES:
                    config_files_found[file] = True

        return {
            'file_count': file_count,
            'total_lines': total_lines,
            'languages': languages,
            'config_files': list(config_files_found.keys()),
            'has_tests': has_tests,
            'has_docs': has_docs,
            'max_depth': max_depth,
            'directory_structure': directory_structure[:50],  # Limit to 50 files
        }

    def extract_code_samples(self, directory: str, max_files: int = 10) -> Dict[str, str]:
        """Extract sample code files for LLM analysis."""
        samples = {}
        extensions = ['.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.go', '.rs']

        for root, _, files in os.walk(directory):
            if len(samples) >= max_files:
                break

            # Skip test and node_modules directories
            if any(pattern in root for pattern in ['test', 'node_modules', '__pycache__', '.git']):
                continue

            for file in files:
                if len(samples) >= max_files:
                    break

                _, ext = os.path.splitext(file)
                if ext not in extensions:
                    continue

                file_path = os.path.join(root, file)

                # Skip large files
                try:
                    if os.path.getsize(file_path) > MAX_FILE_SIZE:
                        continue
                except Exception:
                    continue

                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        # Take first 200 lines
                        lines = content.split('\n')[:200]
                        if lines:
                            samples[file] = '\n'.join(lines)
                except Exception:
                    continue

        return samples

    async def evaluate_with_llm(
        self,
        structure: Dict[str, Any],
        readme: Optional[str],
        code_samples: Dict[str, str]
    ) -> Dict[str, Any]:
        """Use LLM to evaluate the repository."""
        try:
            # Build evaluation prompt
            languages = structure.get('languages', {})
            top_languages = sorted(languages.items(), key=lambda x: x[1], reverse=True)[:5]

            prompt = self._build_evaluation_prompt(
                structure=structure,
                readme=readme,
                code_samples=code_samples,
                top_languages=top_languages
            )

            # Call LLM
            response = self.llm.generate(prompt)

            # Parse response
            return self._parse_llm_response(response)
        except Exception as e:
            logger.error(f"LLM evaluation error: {e}")
            return self._get_default_scores()

    def _build_evaluation_prompt(
        self,
        structure: Dict[str, Any],
        readme: Optional[str],
        code_samples: Dict[str, str],
        top_languages: List[tuple]
    ) -> str:
        """Build evaluation prompt for LLM."""
        # Build file listing
        files_info = []
        for filename in list(code_samples.keys())[:5]:
            files_info.append(f"\n=== {filename} ===\n{code_samples[filename]}")

        languages_str = ', '.join([f"{lang} ({count} files)" for lang, count in top_languages]) if top_languages else "Unknown"

        prompt = f"""You are an expert code reviewer evaluating a GitHub repository for job candidate assessment.

Analyze the following repository and provide scores (0-100) for each category:

**Repository Statistics:**
- Languages: {languages_str}
- Total files: {structure.get('file_count', 0)}
- Total lines of code: {structure.get('total_lines', 0)}
- Has tests: {structure.get('has_tests', False)}
- Has documentation: {structure.get('has_docs', False)}
- Directory depth: {structure.get('max_depth', 0)}
- Config files: {', '.join(structure.get('config_files', [])) or 'None found'}

**README Content:**
{readme[:2000] if readme else 'No README found'}

**Code Samples:**
{''.join(files_info)}

Based on the above information, evaluate and provide:

1. **Code Quality Score (0-100)**: Assess naming conventions, code complexity, SOLID principles, code smells
2. **Documentation Score (0-100)**: Assess README quality, docstrings, inline comments
3. **Best Practices Score (0-100)**: Assess linting, formatting, version control usage, dependency management
4. **Tech Stack Score (0-100)**: Assess use of modern frameworks, appropriate tools, currency of versions
5. **Testing Score (0-100)**: Assess test coverage presence, test quality
6. **Security Score (0-100)**: Assess secrets handling, dependency audit, input validation indicators
7. **Architecture Score (0-100)**: Assess modular design, separation of concerns, scalability indicators

Also provide:
- **Strengths** (list 3-5 strengths as bullet points)
- **Weaknesses** (list 3-5 weaknesses as bullet points)
- **Recommendations** (list 3-5 actionable recommendations)
- **Tech Stack Detected** (list technologies found)

Respond in JSON format:
```json
{{
  "code_quality_score": 0-100,
  "documentation_score": 0-100,
  "best_practices_score": 0-100,
  "tech_stack_score": 0-100,
  "testing_score": 0-100,
  "security_score": 0-100,
  "architecture_score": 0-100,
  "strengths": ["strength1", "strength2", ...],
  "weaknesses": ["weakness1", "weakness2", ...],
  "recommendations": ["rec1", "rec2", ...],
  "tech_stack_detected": ["tech1", "tech2", ...]
}}
```"""
        return prompt

    def _parse_llm_response(self, response: str) -> Dict[str, Any]:
        """Parse LLM response to extract scores."""
        try:
            # Try to extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                data = json.loads(json_match.group())
                return {
                    'code_quality_score': data.get('code_quality_score'),
                    'documentation_score': data.get('documentation_score'),
                    'best_practices_score': data.get('best_practices_score'),
                    'tech_stack_score': data.get('tech_stack_score'),
                    'testing_score': data.get('testing_score'),
                    'security_score': data.get('security_score'),
                    'architecture_score': data.get('architecture_score'),
                    'strengths': data.get('strengths', []),
                    'weaknesses': data.get('weaknesses', []),
                    'recommendations': data.get('recommendations', []),
                    'tech_stack_detected': data.get('tech_stack_detected', []),
                }
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
        except Exception as e:
            logger.error(f"Response parsing error: {e}")

        return self._get_default_scores()

    def _get_default_scores(self) -> Dict[str, Any]:
        """Return default scores when LLM fails."""
        return {
            'code_quality_score': 50,
            'documentation_score': 50,
            'best_practices_score': 50,
            'tech_stack_score': 50,
            'testing_score': 50,
            'security_score': 50,
            'architecture_score': 50,
            'strengths': ['Unable to analyze - LLM evaluation failed'],
            'weaknesses': ['Analysis incomplete'],
            'recommendations': ['Retry evaluation'],
            'tech_stack_detected': [],
        }

    def calculate_overall_score(self, scores: Dict[str, float]) -> float:
        """Calculate weighted overall score."""
        total = 0.0
        for category, weight in RUBRIC_WEIGHTS.items():
            score_key = f"{category}_score"
            score = scores.get(score_key, 0) or 0
            total += score * weight
        return round(total, 2)

    def evaluate_repository(self, repo_url: str, evaluation: RepoEvaluation) -> RepoEvaluation:
        """
        Perform full repository evaluation.

        This method runs synchronously and updates the evaluation object in place.
        """
        temp_dir = None

        try:
            # Parse URL
            parsed = self.parse_github_url(repo_url)
            logger.info(f"Evaluating repo: {parsed['owner']}/{parsed['repo']}")

            # Update status to processing
            evaluation.status = EvaluationStatus.PROCESSING

            # Create temp directory
            temp_dir = tempfile.mkdtemp(prefix='repo_eval_')

            # Try to clone repo (skip if fast mode enabled)
            use_fast_mode = settings.evaluation_fast_mode
            clone_success = not use_fast_mode  # Skip clone in fast mode

            structure = {}
            readme = None

            if use_fast_mode:
                logger.info(f"Using fast mode (GitHub API only) for {parsed['owner']}/{parsed['repo']}")

            if clone_success and os.path.exists(temp_dir):
                # Analyze file structure
                structure = self.analyze_file_structure(temp_dir)
                logger.info(f"File analysis complete: {structure.get('file_count', 0)} files")

                # Read README
                readme_path = None
                for name in ['README.md', 'README.rst', 'README.txt']:
                    potential_path = os.path.join(temp_dir, name)
                    if os.path.exists(potential_path):
                        readme_path = potential_path
                        break

                if readme_path:
                    try:
                        with open(readme_path, 'r', encoding='utf-8', errors='ignore') as f:
                            readme = f.read()
                    except Exception as e:
                        logger.warning(f"Could not read README: {e}")

                # Extract code samples
                code_samples = self.extract_code_samples(temp_dir)

                # Run LLM evaluation
                llm_results = self._run_llm_evaluation_sync(structure, readme, code_samples)
            else:
                # Fallback: use GitHub API
                logger.info("Using GitHub API fallback")
                api_data = self.fetch_repo_contents_api(parsed['owner'], parsed['repo'])

                if api_data:
                    structure = {
                        'file_count': len(api_data.get('files', [])),
                        'readme': api_data.get('readme'),
                        'languages': {},  # Would need more API calls
                        'has_tests': False,
                        'has_docs': bool(api_data.get('readme')),
                        'config_files': [],
                        'max_depth': 0,
                    }
                    readme = api_data.get('readme')

                    # Run LLM with limited data
                    llm_results = self._run_llm_evaluation_sync(structure, readme, {})
                else:
                    raise Exception("Failed to fetch repository data")

            # Update evaluation with results
            evaluation.code_quality_score = llm_results.get('code_quality_score')
            evaluation.documentation_score = llm_results.get('documentation_score')
            evaluation.best_practices_score = llm_results.get('best_practices_score')
            evaluation.tech_stack_score = llm_results.get('tech_stack_score')
            evaluation.testing_score = llm_results.get('testing_score')
            evaluation.security_score = llm_results.get('security_score')
            evaluation.architecture_score = llm_results.get('architecture_score')
            evaluation.strengths = llm_results.get('strengths', [])
            evaluation.weaknesses = llm_results.get('weaknesses', [])
            evaluation.recommendations = llm_results.get('recommendations', [])
            evaluation.tech_stack_detected = llm_results.get('tech_stack_detected', [])

            # Calculate overall score
            scores = {
                'code_quality_score': evaluation.code_quality_score,
                'documentation_score': evaluation.documentation_score,
                'best_practices_score': evaluation.best_practices_score,
                'tech_stack_score': evaluation.tech_stack_score,
                'testing_score': evaluation.testing_score,
                'security_score': evaluation.security_score,
                'architecture_score': evaluation.architecture_score,
            }
            evaluation.overall_score = self.calculate_overall_score(scores)

            # Store evaluation details
            evaluation.evaluation_details = {
                'file_count': structure.get('file_count', 0),
                'total_lines': structure.get('total_lines', 0),
                'languages': structure.get('languages', {}),
                'config_files': structure.get('config_files', []),
                'has_tests': structure.get('has_tests', False),
                'has_docs': structure.get('has_docs', False),
            }

            # Mark complete
            evaluation.status = EvaluationStatus.COMPLETED
            evaluation.completed_at = datetime.utcnow()

            logger.info(f"Evaluation complete: {evaluation.overall_score}")

        except Exception as e:
            logger.error(f"Evaluation failed: {e}", exc_info=True)
            evaluation.status = EvaluationStatus.FAILED
            evaluation.error_message = str(e)
            evaluation.completed_at = datetime.utcnow()

        finally:
            # Cleanup temp directory
            if temp_dir and os.path.exists(temp_dir):
                try:
                    shutil.rmtree(temp_dir)
                except Exception as e:
                    logger.warning(f"Failed to cleanup temp dir: {e}")

        return evaluation

    def _run_llm_evaluation_sync(
        self,
        structure: Dict[str, Any],
        readme: Optional[str],
        code_samples: Dict[str, str]
    ) -> Dict[str, Any]:
        """Run LLM evaluation synchronously."""
        try:
            # Build prompt
            languages = structure.get('languages', {})
            top_languages = sorted(languages.items(), key=lambda x: x[1], reverse=True)[:5]

            prompt = self._build_evaluation_prompt(
                structure=structure,
                readme=readme,
                code_samples=code_samples,
                top_languages=top_languages
            )

            # Call LLM synchronously
            response = self.llm.generate(prompt)

            # Parse response
            return self._parse_llm_response(response)

        except Exception as e:
            logger.error(f"LLM evaluation error: {e}")
            return self._get_default_scores()


# Global service instance
_evaluation_service: Optional[RepoEvaluationService] = None


def get_evaluation_service() -> RepoEvaluationService:
    """Get or create the singleton evaluation service."""
    global _evaluation_service
    if _evaluation_service is None:
        _evaluation_service = RepoEvaluationService()
    return _evaluation_service