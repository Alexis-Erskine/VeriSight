# Contributing to VeriSight

Thank you for your interest in VeriSight. This project is part of a final-year cybersecurity research initiative. Contributions that improve detection accuracy, add datasets, or strengthen the deployment pipeline are especially appreciated.

## How to Contribute

### 1. Fork & Clone

```bash
git clone https://github.com/your-username/verisight.git
cd verisight
```

### 2. Set Up a Development Environment

```bash
python -m venv venv
source venv/bin/activate   # Linux/macOS
# .\venv\Scripts\activate  # Windows
pip install -r requirements.txt
pip install -r dev-requirements.txt  # if available
```

### 3. Create a Feature Branch

```bash
git checkout -b feat/your-feature-name
```

### 4. Make Changes

- Follow the existing code style (4-space indentation, no trailing whitespace)
- Keep functions small and focused
- Add or update tests for any new functionality
- Ensure all existing tests pass: `python -m pytest tests/ -v`

### 5. Run Tests

```bash
python -m pytest tests/ -v --tb=short
```

### 6. Commit Your Changes

Write clear, concise commit messages:

```
feat: add support for Celeb-DF dataset
fix: handle empty frame edge case in preprocessing
docs: update API endpoint table in README
```

### 7. Push and Open a Pull Request

```bash
git push origin feat/your-feature-name
```

Open a PR against the `main` branch. In the description, explain:
- What the change does
- How it was tested
- Any relevant issue numbers

## Code Standards

| Rule | Standard |
|---|---|
| Python version | 3.12+ |
| Formatter | None (keep style consistent with surrounding code) |
| Imports | Standard library → third-party → local (alphabetical within groups) |
| Type hints | Encouraged for new code |
| Tests | Required for new features; `pytest` |

## ML-Specific Guidelines

- If you add a new model architecture, keep the interface compatible with `BaseDeepFakeDetector`
- Pretrained weights should be downloadable (hosted on a public URL), not committed to the repo
- Document the dataset used for training and the expected input shape

## Reporting Issues

- Use the GitHub issue tracker
- Include the full error message and stack trace
- Attach a minimal reproduction where possible

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
