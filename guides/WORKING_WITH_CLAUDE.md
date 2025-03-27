# Working with Claude - Collaboration Guide

## Providing Context Efficiently

- **Repository Structure**: Share key directories and files you're working with.
- **Specific Files**: When asking about code, mention filenames directly.
- **Runtime Environment**: Mention any specific environment details (Node version, etc.).
- **Current Issue**: Explain what you're trying to achieve or what's not working.

## Best Practices for Code Tasks

- **Be Specific**: "Fix the leaderboard sorting in src/managers/leaderboard-manager.ts" works better than "Fix the leaderboard."
- **Highlight Related Files**: "This involves changes to leaderboard-manager.ts and round-ui.ts."
- **Provide Error Messages**: Copy exact error messages when debugging.
- **Implementation Details**: Mention any pattern or approach you prefer.

## Feature Implementation Requests

- **Feature Description**: Clearly describe the feature's purpose and behavior.
- **Related Features**: Mention similar existing features to reference.
- **Acceptance Criteria**: List what constitutes a successful implementation.
- **Edge Cases**: Mention scenarios that need special handling.

## Technical Design Discussions

- **Ask for Options**: "What approaches could we take to implement X?"
- **Request Pros/Cons**: "What are the tradeoffs between these approaches?"
- **Architectural Diagrams**: Ask for simple ASCII/markdown diagrams if helpful.

## Code Review Workflow

- **Review Comments**: Copy the exact code with comments about what to review.
- **Specific Questions**: "Is this implementation of X efficient?"
- **Progressive Refinement**: Start with high-level feedback before details.

## Testing Suggestions

- **Test Scenarios**: "What tests should I add for this new feature?"
- **Test Structure**: Request examples following existing test patterns.

## My Working Process

- I work best when I can:
  - Explore the codebase before implementing changes
  - Understand related files and dependencies
  - See examples of similar existing code
  - Have clarity on the expected behavior

## Limitations to Be Aware Of

- I can't access external systems or run your code.
- I can't remember details from previous sessions.
- I may need to review complex tasks in stages.
- Large codebases benefit from focused, specific questions.

## Feedback Loop

- Tell me when my suggestions work or don't work.
- Correct my understanding if I misinterpret the codebase.
- Let me know which explanations or approaches you find most helpful.