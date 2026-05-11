# Product Overview

## Summary
NextUpTV is an AI-powered TV show recommendation app that suggests 
personalised content based on a user's viewing history, favourite shows, 
keywords, and preference filters.

## Core capabilities
- Generate up to 10 personalised TV show recommendations using Claude AI
- Upload an unstructured file (CSV or text) of previously watched 
  or liked shows as input
- Submit free-text keywords, actor names, show titles, and themes 
  alongside or instead of a file upload
- Filter generated recommendations in real time using preference 
  sliders (runtime, rating, genre tone, age, count)
- Persist recommendations and filter settings between sessions 
  via localStorage

## Primary users
People who watch TV regularly and want personalised recommendations 
without manually browsing streaming platforms. Non-technical. 
Expect a simple, consumer-grade UI with clear empty states and 
minimal configuration required.

## AI integration
- Model: Claude Sonnet 4.6 via Anthropic API
- Route: /api/recommendations
- Input: parsed file content + free-text keywords
- Output: up to 10 TV show recommendations as structured JSON
- Streamed via Vercel AI SDK
- AI is called once per submission — all filtering is client-side

## Stack
- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Anthropic Claude API
- Vercel AI SDK
- localStorage for persistence
- No database in this phase

## Out of scope
- No user authentication or accounts
- No connection to streaming platforms
- No ability to mark shows as watched within the app
- No social or sharing features
- No admin panel
- No mobile app (responsive web only)